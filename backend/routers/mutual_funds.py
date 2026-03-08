import asyncio
import re
import time
from datetime import date, datetime
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from database import get_db
from models import MFHolding

router = APIRouter(prefix="/mf", tags=["Mutual Funds"])

# ---------------------------------------------------------------------------
# In-memory AMFI cache
# ---------------------------------------------------------------------------

_AMFI_CACHE: Dict[str, Any] = {
    "data": None,          # dict[scheme_code_str -> AMFIScheme]
    "fetched_at": 0.0,     # unix timestamp
}
_CACHE_TTL_SECONDS = 3600  # 1 hour

AMFI_NAV_URL = "https://www.amfiindia.com/spages/NAVAll.txt"

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class AMFIScheme(BaseModel):
    scheme_code: str
    isin_growth: Optional[str] = None
    isin_div_reinvest: Optional[str] = None
    scheme_name: str
    net_asset_value: Optional[float] = None
    repurchase_price: Optional[float] = None
    sale_price: Optional[float] = None
    nav_date: Optional[str] = None
    fund_house: Optional[str] = None
    scheme_type: Optional[str] = None
    scheme_category: Optional[str] = None


class NAVResponse(BaseModel):
    scheme_code: str
    scheme_name: str
    fund_house: Optional[str] = None
    scheme_type: Optional[str] = None
    scheme_category: Optional[str] = None
    isin_growth: Optional[str] = None
    isin_div_reinvest: Optional[str] = None
    net_asset_value: Optional[float] = None
    repurchase_price: Optional[float] = None
    sale_price: Optional[float] = None
    nav_date: Optional[str] = None


class NAVSearchResponse(BaseModel):
    total: int
    results: List[NAVResponse]


class MFCentralOTPRequest(BaseModel):
    pan: str = Field(..., min_length=10, max_length=10, description="PAN card number")
    email: str = Field(..., description="Registered email address")
    mobile: Optional[str] = Field(None, description="Registered mobile number")

    @validator("pan")
    def validate_pan(cls, v: str) -> str:
        pattern = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
        if not pattern.match(v.upper()):
            raise ValueError("Invalid PAN format. Expected format: ABCDE1234F")
        return v.upper()


class MFCentralOTPResponse(BaseModel):
    success: bool
    message: str
    request_id: str
    pan: str
    email: str
    otp_expires_in_seconds: int = 300


class MFCentralVerifyRequest(BaseModel):
    request_id: str = Field(..., description="Request ID received from OTP initiation")
    otp: str = Field(..., min_length=4, max_length=8, description="OTP received on email/mobile")


class FolioHolding(BaseModel):
    scheme_code: Optional[str] = None
    scheme_name: str
    isin: Optional[str] = None
    folio_number: str
    units: float
    nav: float
    current_value_inr: float
    cost_value_inr: float
    xirr: Optional[float] = None
    purchase_date: Optional[str] = None
    dividend_option: Optional[str] = None
    growth_option: Optional[str] = None
    fund_house: str
    scheme_type: str
    lock_in_days: Optional[int] = None
    nominee_registered: bool = False


class CASData(BaseModel):
    pan: str
    name: str
    email: str
    generated_on: str
    period_from: str
    period_to: str
    total_invested_inr: float
    total_current_value_inr: float
    total_gain_loss_inr: float
    total_gain_loss_pct: float
    overall_xirr: float
    folios: List[FolioHolding]


class MFCentralVerifyResponse(BaseModel):
    success: bool
    message: str
    cas_data: CASData


class MFHoldingCreate(BaseModel):
    user_id: Optional[int] = None
    scheme_code: str
    scheme_name: str
    fund_house: Optional[str] = None
    folio_number: Optional[str] = None
    units: float = Field(..., gt=0)
    average_nav: float = Field(..., gt=0)
    invested_amount_inr: float = Field(..., gt=0)
    purchase_date: Optional[date] = None
    isin: Optional[str] = None
    scheme_type: Optional[str] = None
    dividend_option: Optional[str] = None


class MFHoldingResponse(BaseModel):
    id: int
    user_id: Optional[int]
    scheme_code: str
    scheme_name: str
    fund_house: Optional[str]
    folio_number: Optional[str]
    units: float
    average_nav: float
    invested_amount_inr: float
    current_nav: Optional[float]
    current_value_inr: Optional[float]
    gain_loss_inr: Optional[float]
    gain_loss_pct: Optional[float]
    purchase_date: Optional[date]
    isin: Optional[str]
    scheme_type: Optional[str]
    dividend_option: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class MFHoldingsListResponse(BaseModel):
    total: int
    total_invested_inr: float
    total_current_value_inr: float
    total_gain_loss_inr: float
    total_gain_loss_pct: float
    holdings: List[MFHoldingResponse]


# ---------------------------------------------------------------------------
# AMFI parsing helpers
# ---------------------------------------------------------------------------


def _parse_amfi_nav_text(raw_text: str) -> Dict[str, AMFIScheme]:
    """
    Parse AMFI NAV text file.

    The file format is:

        Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Repurchase Price;Sale Price;Date

    Preceded by fund-house / type / category header lines that look like:

        Open Ended Schemes(Debt Scheme - Banking and PSU Fund)
        HDFC Mutual Fund
        HDFC Banking and PSU Debt Fund - Growth Option
        ...

    Actually the modern format (2023-24) is pipe-delimited for some versions
    and semicolon-delimited for others.  The authoritative file uses semicolons.
    """
    schemes: Dict[str, AMFIScheme] = {}

    current_fund_house: Optional[str] = None
    current_scheme_type: Optional[str] = None
    current_scheme_category: Optional[str] = None

    # Detect delimiter: some AMFI files use semicolon, others pipe
    delimiter = ";"
    for line in raw_text.splitlines()[:30]:
        stripped = line.strip()
        if stripped and "|" in stripped and not stripped.startswith("Scheme"):
            # heuristic: if many pipes appear before any semicolons
            pipe_count = stripped.count("|")
            semi_count = stripped.count(";")
            if pipe_count > semi_count:
                delimiter = "|"
            break

    for raw_line in raw_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        # Skip the header row
        if line.lower().startswith("scheme code"):
            continue

        parts = [p.strip() for p in line.split(delimiter)]

        # If we get 6-8 parts and the first part is a numeric scheme code, it
        # is a data row.
        if len(parts) >= 6 and parts[0].isdigit():
            scheme_code = parts[0]
            # Different column layouts exist in AMFI data
            # Most common (8 cols): Code;ISIN_G;ISIN_D;Name;NAV;Repurchase;Sale;Date
            # Minimal (6 cols):    Code;-;-;Name;NAV;Date
            if len(parts) >= 8:
                isin_growth_raw = parts[1] if parts[1] not in ("-", "", "N.A.") else None
                isin_div_raw = parts[2] if parts[2] not in ("-", "", "N.A.") else None
                scheme_name = parts[3]
                nav_raw = parts[4]
                repurchase_raw = parts[5]
                sale_raw = parts[6]
                nav_date = parts[7]
            elif len(parts) == 7:
                isin_growth_raw = parts[1] if parts[1] not in ("-", "", "N.A.") else None
                isin_div_raw = parts[2] if parts[2] not in ("-", "", "N.A.") else None
                scheme_name = parts[3]
                nav_raw = parts[4]
                repurchase_raw = parts[5]
                sale_raw = None
                nav_date = parts[6]
            else:
                isin_growth_raw = None
                isin_div_raw = None
                scheme_name = parts[3] if len(parts) > 3 else line
                nav_raw = parts[4] if len(parts) > 4 else "0"
                repurchase_raw = None
                sale_raw = None
                nav_date = parts[-1]

            def _safe_float(val: Optional[str]) -> Optional[float]:
                if not val or val in ("-", "N.A.", ""):
                    return None
                try:
                    return float(val.replace(",", ""))
                except ValueError:
                    return None

            schemes[scheme_code] = AMFIScheme(
                scheme_code=scheme_code,
                isin_growth=isin_growth_raw,
                isin_div_reinvest=isin_div_raw,
                scheme_name=scheme_name,
                net_asset_value=_safe_float(nav_raw),
                repurchase_price=_safe_float(repurchase_raw),
                sale_price=_safe_float(sale_raw),
                nav_date=nav_date,
                fund_house=current_fund_house,
                scheme_type=current_scheme_type,
                scheme_category=current_scheme_category,
            )
        else:
            # Header / metadata line â try to extract context
            # Scheme type lines: e.g. "Open Ended Schemes(Equity Scheme - Large Cap Fund)"
            type_cat_match = re.match(
                r"^(Open Ended Schemes|Close Ended Schemes|Interval Schemes)"
                r"\((.+)\)$",
                line,
                re.IGNORECASE,
            )
            if type_cat_match:
                current_scheme_type = type_cat_match.group(1).strip()
                current_scheme_category = type_cat_match.group(2).strip()
                continue

            # Fund house line: typically all words capitalised ending in
            # "Mutual Fund" or "Asset Management" etc.
            if (
                not any(c.isdigit() for c in line)
                and len(line) > 5
                and not line.startswith("-")
                and delimiter not in line
            ):
                current_fund_house = line

    return schemes


async def _fetch_amfi_data() -> Dict[str, AMFIScheme]:
    """Return parsed AMFI data, using cache if fresh."""
    now = time.time()
    if (
        _AMFI_CACHE["data"] is not None
        and (now - _AMFI_CACHE["fetched_at"]) < _CACHE_TTL_SECONDS
    ):
        return _AMFI_CACHE["data"]  # type: ignore[return-value]

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(AMFI_NAV_URL)
            resp.raise_for_status()
            raw_text = resp.text
    except httpx.HTTPError as exc:
        # If cache is stale but not None, return stale data rather than failing
        if _AMFI_CACHE["data"] is not None:
            return _AMFI_CACHE["data"]  # type: ignore[return-value]
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch AMFI NAV data: {exc}",
        )

    parsed = _parse_amfi_nav_text(raw_text)
    _AMFI_CACHE["data"] = parsed
    _AMFI_CACHE["fetched_at"] = now
    return parsed


def _scheme_to_nav_response(scheme: AMFIScheme) -> NAVResponse:
    return NAVResponse(
        scheme_code=scheme.scheme_code,
        scheme_name=scheme.scheme_name,
        fund_house=scheme.fund_house,
        scheme_type=scheme.scheme_type,
        scheme_category=scheme.scheme_category,
        isin_growth=scheme.isin_growth,
        isin_div_reinvest=scheme.isin_div_reinvest,
        net_asset_value=scheme.net_asset_value,
        repurchase_price=scheme.repurchase_price,
        sale_price=scheme.sale_price,
        nav_date=scheme.nav_date,
    )


# ---------------------------------------------------------------------------
# Mock CAS helpers
# ---------------------------------------------------------------------------

# In production these would be persisted; for the mock flow we keep them in
# memory keyed by request_id.
_OTP_STORE: Dict[str, Dict[str, str]] = {}
_MOCK_OTP = "123456"  # fixed OTP for mock flow


def _generate_request_id(pan: str) -> str:
    import hashlib
    import uuid
    token = f"{pan}-{uuid.uuid4()}"
    return hashlib.sha256(token.encode()).hexdigest()[:32]


def _build_mock_cas(pan: str, email: str) -> CASData:
    """Return a realistic mock CAS statement."""
    today = date.today().isoformat()
    period_from = "2020-04-01"

    folios: List[FolioHolding] = [
        FolioHolding(
            scheme_code="120503",
            scheme_name="Mirae Asset Large Cap Fund - Regular Plan - Growth",
            isin="INF769K01010",
            folio_number="9012345/67",
            units=1245.678,
            nav=102.45,
            current_value_inr=127638.71,
            cost_value_inr=95000.00,
            xirr=14.32,
            purchase_date="2020-06-15",
            dividend_option=None,
            growth_option="Growth",
            fund_house="Mirae Asset Investment Managers (India) Pvt. Ltd.",
            scheme_type="Open Ended Schemes",
            lock_in_days=0,
            nominee_registered=True,
        ),
        FolioHolding(
            scheme_code="100119",
            scheme_name="HDFC Mid-Cap Opportunities Fund - Regular Plan - Growth",
            isin="INF179K01BB4",
            folio_number="3647891/20",
            units=876.543,
            nav=148.78,
            current_value_inr=130386.24,
            cost_value_inr=90000.00,
            xirr=18.65,
            purchase_date="2021-01-10",
            dividend_option=None,
            growth_option="Growth",
            fund_house="HDFC Asset Management Company Ltd.",
            scheme_type="Open Ended Schemes",
            lock_in_days=0,
            nominee_registered=True,
        ),
        FolioHolding(
            scheme_code="119598",
            scheme_name="Axis Long Term Equity Fund - Regular Plan - Growth (ELSS)",
            isin="INF846K01DP8",
            folio_number="5543210/01",
            units=500.000,
            nav=72.34,
            current_value_inr=36170.00,
            cost_value_inr=30000.00,
            xirr=9.87,
            purchase_date="2022-03-28",
            dividend_option=None,
            growth_option="Growth",
            fund_house="Axis Asset Management Company Ltd.",
            scheme_type="Open Ended Schemes",
            lock_in_days=1095,
            nominee_registered=False,
        ),
        FolioHolding(
            scheme_code="145552",
            scheme_name="Parag Parikh Flexi Cap Fund - Regular Plan - Growth",
            isin="INF879O01019",
            folio_number="8821034/11",
            units=2100.000,
            nav=64.80,
            current_value_inr=136080.00,
            cost_value_inr=100000.00,
            xirr=21.45,
            purchase_date="2019-11-05",
            dividend_option=None,
            growth_option="Growth",
            fund_house="PPFAS Asset Management Pvt. Ltd.",
            scheme_type="Open Ended Schemes",
            lock_in_days=0,
            nominee_registered=True,
        ),
        FolioHolding(
            scheme_code="147622",
            scheme_name="SBI Liquid Fund - Regular Plan - Growth",
            isin="INF200K01RB2",
            folio_number="2234567/88",
            units=98.765,
            nav=3524.12,
            current_value_inr=348163.95,
            cost_value_inr=340000.00,
            xirr=6.78,
            purchase_date="2023-07-01",
            dividend_option=None,
            growth_option="Growth",
            fund_house="SBI Funds Management Ltd.",
            scheme_type="Open Ended Schemes",
            lock_in_days=0,
            nominee_registered=True,
        ),
    ]

    total_invested = sum(f.cost_value_inr for f in folios)
    total_current = sum(f.current_value_inr for f in folios)
    total_gain = total_current - total_invested
    gain_pct = round((total_gain / total_invested) * 100, 2) if total_invested else 0.0

    return CASData(
        pan=pan,
        name="RAKESH KUMAR SHARMA",
        email=email,
        generated_on=today,
        period_from=period_from,
        period_to=today,
        total_invested_inr=round(total_invested, 2),
        total_current_value_inr=round(total_current, 2),
        total_gain_loss_inr=round(total_gain, 2),
        total_gain_loss_pct=gain_pct,
        overall_xirr=15.43,
        folios=folios,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get(
    "/nav/{scheme_code}",
    response_model=NAVResponse,
    summary="Fetch latest NAV by scheme code",
)
async def get_nav_by_scheme_code(scheme_code: str) -> NAVResponse:
    """
    Fetch the latest NAV for a mutual fund scheme using its AMFI scheme code.
    Data is sourced live from the AMFI NAVAll.txt feed and cached for 1 hour.
    """
    amfi_data = await _fetch_amfi_data()
    scheme = amfi_data.get(scheme_code)
    if scheme is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scheme with code '{scheme_code}' not found in AMFI data.",
        )
    return _scheme_to_nav_response(scheme)


@router.get(
    "/nav/search",
    response_model=NAVSearchResponse,
    summary="Search mutual fund schemes by name",
)
async def search_nav_by_name(
    query: str = Query(..., min_length=3, description="Scheme name or keyword to search"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results to return"),
) -> NAVSearchResponse:
    """
    Search for mutual fund schemes by name substring match (case-insensitive).
    Returns up to `limit` results from AMFI NAV data.
    """
    amfi_data = await _fetch_amfi_data()
    query_lower = query.lower()
    matched = [
        _scheme_to_nav_response(s)
        for s in amfi_data.values()
        if query_lower in s.scheme_name.lower()
    ]
    # Sort by scheme name for deterministic ordering
    matched.sort(key=lambda x: x.scheme_name)
    return NAVSearchResponse(total=len(matched), results=matched[:limit])


@router.post(
    "/central/otp",
    response_model=MFCentralOTPResponse,
    status_code=status.HTTP_200_OK,
    summary="Initiate MF Central CAS fetch â send OTP",
)
async def initiate_mf_central_otp(
    payload: MFCentralOTPRequest,
) -> MFCentralOTPResponse:
    """
    Initiate MF Central portfolio fetch by sending an OTP to the registered
    email / mobile linked with the given PAN.  (Mock implementation.)
    """
    import uuid

    request_id = _generate_request_id(payload.pan)
    _OTP_STORE[request_id] = {
        "pan": payload.pan,
        "email": payload.email,
        "otp": _MOCK_OTP,
        "created_at": str(time.time()),
    }
    return MFCentralOTPResponse(
        success=True,
        message=(
            f"OTP has been sent to the email address {payload.email[:3]}***"
            f"{payload.email[payload.email.index('@'):]}"
            " registered with MF Central. Use OTP '123456' in sandbox mode."
        ),
        request_id=request_id,
        pan=payload.pan,
        email=payload.email,
        otp_expires_in_seconds=300,
    )


@router.post(
    "/central/verify",
    response_model=MFCentralVerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify OTP and retrieve CAS data from MF Central",
)
async def verify_mf_central_otp(
    payload: MFCentralVerifyRequest,
) -> MFCentralVerifyResponse:
    """
    Verify the OTP received from MF Central and return the full Consolidated
    Account Statement (CAS) data.  (Mock implementation with realistic data.)
    """
    session_data = _OTP_STORE.get(payload.request_id)
    if session_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired request_id. Please initiate a new OTP request.",
        )

    # Check OTP expiry (5 minutes)
    created_at = float(session_data["created_at"])
    if time.time() - created_at > 300:
        _OTP_STORE.pop(payload.request_id, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please initiate a new OTP request.",
        )

    # Validate OTP
    if payload.otp != session_data["otp"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP. Please check and try again.",
        )

    pan = session_data["pan"]
    email = session_data["email"]
    _OTP_STORE.pop(payload.request_id, None)  # consume

    cas = _build_mock_cas(pan, email)
    return MFCentralVerifyResponse(
        success=True,
        message="CAS data successfully retrieved from MF Central.",
        cas_data=cas,
    )


@router.get(
    "/holdings",
    response_model=MFHoldingsListResponse,
    summary="List all mutual fund holdings from database",
)
async def list_mf_holdings(
    user_id: Optional[int] = Query(None, description="Filter holdings by user ID"),
    db: Session = Depends(get_db),
) -> MFHoldingsListResponse:
    """
    Retrieve all saved mutual fund holdings.  Optionally enriches each holding
    with the latest NAV from AMFI to show current value and gain/loss.
    """
    query = db.query(MFHolding)
    if user_id is not None:
        query = query.filter(MFHolding.user_id == user_id)
    holdings_db = query.all()

    # Best-effort NAV enrichment â don't fail the endpoint if AMFI is down
    try:
        amfi_data = await _fetch_amfi_data()
    except HTTPException:
        amfi_data = {}

    response_list: List[MFHoldingResponse] = []
    total_invested = 0.0
    total_current = 0.0

    for h in holdings_db:
        current_nav: Optional[float] = None
        current_value: Optional[float] = None
        gain_loss: Optional[float] = None
        gain_loss_pct: Optional[float] = None

        scheme = amfi_data.get(str(h.scheme_code))
        if scheme and scheme.net_asset_value:
            current_nav = scheme.net_asset_value
            current_value = round(h.units * current_nav, 2)
            gain_loss = round(current_value - h.invested_amount_inr, 2)
            gain_loss_pct = (
                round((gain_loss / h.invested_amount_inr) * 100, 2)
                if h.invested_amount_inr
                else 0.0
            )

        total_invested += h.invested_amount_inr
        total_current += current_value if current_value is not None else h.invested_amount_inr

        response_list.append(
            MFHoldingResponse(
                id=h.id,
                user_id=h.user_id,
                scheme_code=h.scheme_code,
                scheme_name=h.scheme_name,
                fund_house=h.fund_house,
                folio_number=h.folio_number,
                units=h.units,
                average_nav=h.average_nav,
                invested_amount_inr=h.invested_amount_inr,
                current_nav=current_nav,
                current_value_inr=current_value,
                gain_loss_inr=gain_loss,
                gain_loss_pct=gain_loss_pct,
                purchase_date=h.purchase_date,
                isin=h.isin,
                scheme_type=h.scheme_type,
                dividend_option=h.dividend_option,
                created_at=h.created_at,
                updated_at=h.updated_at,
            )
        )

    total_gain = total_current - total_invested
    gain_pct = round((total_gain / total_invested) * 100, 2) if total_invested else 0.0

    return MFHoldingsListResponse(
        total=len(response_list),
        total_invested_inr=round(total_invested, 2),
        total_current_value_inr=round(total_current, 2),
        total_gain_loss_inr=round(total_gain, 2),
        total_gain_loss_pct=gain_pct,
        holdings=response_list,
    )


@router.post(
    "/holdings",
    response_model=MFHoldingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new mutual fund holding",
)
async def add_mf_holding(
    payload: MFHoldingCreate,
    db: Session = Depends(get_db),
) -> MFHoldingResponse:
    """
    Save a new mutual fund holding to the database.  The latest NAV is fetched
    from AMFI to compute current value and gain/loss at creation time.
    """
    # Validate scheme exists in AMFI (best-effort)
    current_nav: Optional[float] = None
    current_value: Optional[float] = None
    gain_loss: Optional[float] = None
    gain_loss_pct: Optional[float] = None
    fund_house = payload.fund_house
    scheme_type = payload.scheme_type

    try:
        amfi_data = await _fetch_amfi_data()
        scheme = amfi_data.get(str(payload.scheme_code))
        if scheme:
            if scheme.net_asset_value:
                current_nav = scheme.net_asset_value
                current_value = round(payload.units * current_nav, 2)
                gain_loss = round(current_value - payload.invested_amount_inr, 2)
                gain_loss_pct = (
                    round((gain_loss / payload.invested_amount_inr) * 100, 2)
                    if payload.invested_amount_inr
                    else 0.0
                )
            if not fund_house and scheme.fund_house:
                fund_house = scheme.fund_house
            if not scheme_type and scheme.scheme_type:
                scheme_type = scheme.scheme_type
        else:
            # scheme_code not found â still allow saving
            pass
    except HTTPException:
        pass  # AMFI unavailable; proceed without enrichment

    db_holding = MFHolding(
        user_id=payload.user_id,
        scheme_code=payload.scheme_code,
        scheme_name=payload.scheme_name,
        fund_house=fund_house,
        folio_number=payload.folio_number,
        units=payload.units,
        average_nav=payload.average_nav,
        invested_amount_inr=payload.invested_amount_inr,
        purchase_date=payload.purchase_date,
        isin=payload.isin,
        scheme_type=scheme_type,
        dividend_option=payload.dividend_option,
    )
    db.add(db_holding)
    try:
        db.commit()
        db.refresh(db_holding)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error while saving holding: {exc}",
        )

    return MFHoldingResponse(
        id=db_holding.id,
        user_id=db_holding.user_id,
        scheme_code=db_holding.scheme_code,
        scheme_name=db_holding.scheme_name,
        fund_house=db_holding.fund_house,
        folio_number=db_holding.folio_number,
        units=db_holding.units,
        average_nav=db_holding.average_nav,
        invested_amount_inr=db_holding.invested_amount_inr,
        current_nav=current_nav,
        current_value_inr=current_value,
        gain_loss_inr=gain_loss,
        gain_loss_pct=gain_loss_pct,
        purchase_date=db_holding.purchase_date,
        isin=db_holding.isin,
        scheme_type=db_holding.scheme_type,
        dividend_option=db_holding.dividend_option,
        created_at=db_holding.created_at,
        updated_at=db_holding.updated_at,
    )
