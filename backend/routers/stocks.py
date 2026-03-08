import csv
import io
import logging
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field, validator
from sqlalchemy import Column, Float, Integer, String, Text, func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from database import Base, get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stocks", tags=["stocks"])

# ---------------------------------------------------------------------------
# SQLAlchemy Model
# ---------------------------------------------------------------------------

class StockHolding(Base):
    __tablename__ = "stock_holdings"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(50), nullable=False, index=True)
    company_name = Column(String(255), nullable=False)
    quantity = Column(Float, nullable=False)
    avg_cost = Column(Float, nullable=False)
    ltp = Column(Float, nullable=True)  # Last Traded Price at import time
    sector = Column(String(100), nullable=True)
    exchange = Column(String(20), nullable=True, default="NSE")


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class StockHoldingBase(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=50, description="NSE stock symbol")
    company_name: str = Field(..., min_length=1, max_length=255)
    quantity: float = Field(..., gt=0, description="Number of shares held")
    avg_cost: float = Field(..., gt=0, description="Average cost per share in INR")
    ltp: Optional[float] = Field(None, ge=0, description="Last traded price in INR")
    sector: Optional[str] = Field(None, max_length=100)
    exchange: Optional[str] = Field("NSE", max_length=20)

    @validator("symbol")
    def symbol_uppercase(cls, v: str) -> str:
        return v.strip().upper()


class StockHoldingCreate(StockHoldingBase):
    pass


class StockHoldingUpdate(BaseModel):
    symbol: Optional[str] = Field(None, min_length=1, max_length=50)
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)
    quantity: Optional[float] = Field(None, gt=0)
    avg_cost: Optional[float] = Field(None, gt=0)
    ltp: Optional[float] = Field(None, ge=0)
    sector: Optional[str] = Field(None, max_length=100)
    exchange: Optional[str] = Field(None, max_length=20)

    @validator("symbol")
    def symbol_uppercase(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().upper() if v else v


class StockHoldingResponse(StockHoldingBase):
    id: int
    current_value: Optional[float] = None
    invested_value: float
    profit_loss: Optional[float] = None
    profit_loss_pct: Optional[float] = None

    class Config:
        orm_mode = True

    @classmethod
    def from_orm_with_calc(cls, obj: StockHolding) -> "StockHoldingResponse":
        invested = obj.quantity * obj.avg_cost
        current = obj.quantity * obj.ltp if obj.ltp is not None else None
        pl = (current - invested) if current is not None else None
        pl_pct = ((pl / invested) * 100) if (pl is not None and invested > 0) else None
        return cls(
            id=obj.id,
            symbol=obj.symbol,
            company_name=obj.company_name,
            quantity=obj.quantity,
            avg_cost=obj.avg_cost,
            ltp=obj.ltp,
            sector=obj.sector,
            exchange=obj.exchange,
            invested_value=round(invested, 2),
            current_value=round(current, 2) if current is not None else None,
            profit_loss=round(pl, 2) if pl is not None else None,
            profit_loss_pct=round(pl_pct, 2) if pl_pct is not None else None,
        )


class LivePriceResponse(BaseModel):
    symbol: str
    company_name: Optional[str] = None
    last_price: float
    change: Optional[float] = None
    pct_change: Optional[float] = None
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    year_high: Optional[float] = None
    year_low: Optional[float] = None
    volume: Optional[int] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    sector: Optional[str] = None


class SectorBreakdown(BaseModel):
    sector: str
    total_invested: float
    total_current_value: Optional[float]
    holding_count: int
    symbols: List[str]
    weight_pct: Optional[float] = None


class ImportCSVResponse(BaseModel):
    imported: int
    skipped: int
    errors: List[str]
    holdings: List[StockHoldingResponse]


# ---------------------------------------------------------------------------
# Sector mapping for popular Indian stocks (NSE symbols)
# ---------------------------------------------------------------------------

INDIAN_STOCK_SECTORS: Dict[str, str] = {
    # IT
    "TCS": "Information Technology",
    "INFY": "Information Technology",
    "WIPRO": "Information Technology",
    "HCLTECH": "Information Technology",
    "TECHM": "Information Technology",
    "MPHASIS": "Information Technology",
    "LTIM": "Information Technology",
    "COFORGE": "Information Technology",
    "PERSISTENT": "Information Technology",
    "OFSS": "Information Technology",
    # Banking & Finance
    "HDFCBANK": "Banking & Finance",
    "ICICIBANK": "Banking & Finance",
    "KOTAKBANK": "Banking & Finance",
    "SBIN": "Banking & Finance",
    "AXISBANK": "Banking & Finance",
    "INDUSINDBK": "Banking & Finance",
    "BANDHANBNK": "Banking & Finance",
    "IDFCFIRSTB": "Banking & Finance",
    "FEDERALBNK": "Banking & Finance",
    "PNB": "Banking & Finance",
    "BANKBARODA": "Banking & Finance",
    "CANBK": "Banking & Finance",
    "BAJFINANCE": "Banking & Finance",
    "BAJAJFINSV": "Banking & Finance",
    "MUTHOOTFIN": "Banking & Finance",
    "CHOLAFIN": "Banking & Finance",
    "M&MFIN": "Banking & Finance",
    "SHRIRAMFIN": "Banking & Finance",
    # FMCG
    "HINDUNILVR": "FMCG",
    "ITC": "FMCG",
    "NESTLEIND": "FMCG",
    "BRITANNIA": "FMCG",
    "DABUR": "FMCG",
    "MARICO": "FMCG",
    "COLPAL": "FMCG",
    "GODREJCP": "FMCG",
    "EMAMILTD": "FMCG",
    "VBL": "FMCG",
    # Pharma & Healthcare
    "SUNPHARMA": "Pharma & Healthcare",
    "DRREDDY": "Pharma & Healthcare",
    "CIPLA": "Pharma & Healthcare",
    "DIVISLAB": "Pharma & Healthcare",
    "BIOCON": "Pharma & Healthcare",
    "TORNTPHARM": "Pharma & Healthcare",
    "AUROPHARMA": "Pharma & Healthcare",
    "LUPIN": "Pharma & Healthcare",
    "ALKEM": "Pharma & Healthcare",
    "APOLLOHOSP": "Pharma & Healthcare",
    "MAXHEALTH": "Pharma & Healthcare",
    "FORTIS": "Pharma & Healthcare",
    # Auto
    "MARUTI": "Automobile",
    "TATAMOTORS": "Automobile",
    "M&M": "Automobile",
    "BAJAJ-AUTO": "Automobile",
    "EICHERMOT": "Automobile",
    "HEROMOTOCO": "Automobile",
    "TVSMOTOR": "Automobile",
    "ASHOKLEY": "Automobile",
    "MOTHERSON": "Automobile",
    "BOSCHLTD": "Automobile",
    # Energy
    "RELIANCE": "Energy",
    "ONGC": "Energy",
    "IOC": "Energy",
    "BPCL": "Energy",
    "NTPC": "Energy",
    "POWERGRID": "Energy",
    "ADANIGREEN": "Energy",
    "ADANIPORTS": "Energy",
    "ADANIENT": "Energy",
    "TATAPOWER": "Energy",
    "CESC": "Energy",
    "TORNTPOWER": "Energy",
    # Metals & Mining
    "TATASTEEL": "Metals & Mining",
    "HINDALCO": "Metals & Mining",
    "JSWSTEEL": "Metals & Mining",
    "VEDL": "Metals & Mining",
    "COALINDIA": "Metals & Mining",
    "NMDC": "Metals & Mining",
    "SAIL": "Metals & Mining",
    "NATIONALUM": "Metals & Mining",
    # Cement
    "ULTRACEMCO": "Cement",
    "SHREECEM": "Cement",
    "AMBUJACEM": "Cement",
    "ACC": "Cement",
    "DALMIACEMT": "Cement",
    "JKCEMENT": "Cement",
    # Telecom
    "BHARTIARTL": "Telecom",
    "IDEA": "Telecom",
    "TATACOMM": "Telecom",
    # Consumer Discretionary
    "TITAN": "Consumer Discretionary",
    "ASIANPAINT": "Consumer Discretionary",
    "BERGEPAINT": "Consumer Discretionary",
    "PIDILITIND": "Consumer Discretionary",
    "HAVELLS": "Consumer Discretionary",
    "VOLTAS": "Consumer Discretionary",
    "WHIRLPOOL": "Consumer Discretionary",
    "BATAINDIA": "Consumer Discretionary",
    "PAGEIND": "Consumer Discretionary",
    "ABFRL": "Consumer Discretionary",
    # Real Estate
    "DLF": "Real Estate",
    "GODREJPROP": "Real Estate",
    "OBEROIRLTY": "Real Estate",
    "PRESTIGE": "Real Estate",
    "BRIGADE": "Real Estate",
    "SOBHA": "Real Estate",
    # Capital Goods & Industrials
    "LT": "Capital Goods",
    "SIEMENS": "Capital Goods",
    "ABB": "Capital Goods",
    "BEL": "Capital Goods",
    "HAL": "Capital Goods",
    "BHEL": "Capital Goods",
    "CUMMINSIND": "Capital Goods",
    "THERMAX": "Capital Goods",
    # Insurance
    "LICI": "Insurance",
    "SBILIFE": "Insurance",
    "HDFCLIFE": "Insurance",
    "ICICIlombard": "Insurance",
    "GICRE": "Insurance",
    "NIACL": "Insurance",
    # Retail & E-commerce
    "DMART": "Retail",
    "TRENT": "Retail",
    "NYKAA": "Retail",
    "ZOMATO": "Retail",
    "PAYTM": "Fintech",
    "POLICYBZR": "Fintech",
}


def get_sector(symbol: str) -> str:
    return INDIAN_STOCK_SECTORS.get(symbol.upper(), "Others")


# ---------------------------------------------------------------------------
# NSE Client
# ---------------------------------------------------------------------------

NSE_BASE_URL = "https://www.nseindia.com"
NSE_QUOTE_URL = "https://www.nseindia.com/api/quote-equity?symbol={symbol}"

NSE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;"
        "q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Referer": "https://www.nseindia.com/",
    "DNT": "1",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
}

NSE_API_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Referer": "https://www.nseindia.com/",
    "X-Requested-With": "XMLHttpRequest",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
}


async def fetch_nse_live_price(symbol: str) -> Dict[str, Any]:
    """
    Fetch live stock price from NSE India.
    NSE requires a valid session cookie obtained by first visiting the homepage.
    """
    symbol_upper = symbol.upper()

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(30.0, connect=15.0),
        follow_redirects=True,
        limits=httpx.Limits(max_connections=5),
    ) as client:
        # Step 1: Visit NSE homepage to get session cookies
        try:
            home_response = await client.get(
                NSE_BASE_URL,
                headers=NSE_HEADERS,
            )
            home_response.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.error("NSE homepage request failed: %s", e)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Unable to establish NSE session: HTTP {e.response.status_code}",
            )
        except httpx.RequestError as e:
            logger.error("NSE homepage network error: %s", e)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to connect to NSE India. Please try again later.",
            )

        cookies = dict(home_response.cookies)
        if not cookies:
            logger.warning("No cookies received from NSE homepage")

        # Step 2: Fetch quote using session cookies
        api_url = NSE_QUOTE_URL.format(symbol=symbol_upper)
        try:
            api_response = await client.get(
                api_url,
                headers=NSE_API_HEADERS,
                cookies=cookies,
            )
            if api_response.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Symbol '{symbol_upper}' not found on NSE.",
                )
            api_response.raise_for_status()
        except HTTPException:
            raise
        except httpx.HTTPStatusError as e:
            logger.error("NSE API request failed for %s: %s", symbol_upper, e)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"NSE API error for symbol {symbol_upper}: HTTP {e.response.status_code}",
            )
        except httpx.RequestError as e:
            logger.error("NSE API network error for %s: %s", symbol_upper, e)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Network error while fetching live price from NSE.",
            )

        try:
            data = api_response.json()
        except Exception as e:
            logger.error("Failed to parse NSE JSON response for %s: %s", symbol_upper, e)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Invalid response received from NSE API.",
            )

    return data


def parse_nse_response(symbol: str, data: Dict[str, Any]) -> LivePriceResponse:
    """
    Parse NSE API JSON response into LivePriceResponse.
    NSE API returns nested structure with 'priceInfo', 'info', 'metadata' keys.
    """
    try:
        price_info = data.get("priceInfo", {})
        info = data.get("info", {})
        metadata = data.get("metadata", {})
        industry_info = data.get("industryInfo", {})

        last_price = float(price_info.get("lastPrice", 0))
        change = float(price_info.get("change", 0))
        pct_change = float(price_info.get("pChange", 0))

        intrinsic = price_info.get("intrinsicValue", {})
        week_high_low = price_info.get("weekHighLow", {})

        day_high = float(price_info.get("intraDayHighLow", {}).get("max", 0)) or None
        day_low = float(price_info.get("intraDayHighLow", {}).get("min", 0)) or None
        year_high = float(week_high_low.get("max", 0)) or None
        year_low = float(week_high_low.get("min", 0)) or None

        volume_data = data.get("securityWiseDP", {})
        volume = None
        if volume_data:
            try:
                volume = int(volume_data.get("quantityTraded", 0)) or None
            except (ValueError, TypeError):
                volume = None

        market_cap = None
        try:
            mc_raw = metadata.get("pdSectorPe") or info.get("pdSectorPe")
        except Exception:
            mc_raw = None

        pe_ratio = None
        try:
            pe_raw = price_info.get("priceBand", {}).get("lowerLimit")
            # PE is not directly in priceInfo; check pdSymbolPe
            pe_ratio_raw = data.get("metadata", {}).get("pdSymbolPe")
            if pe_ratio_raw:
                pe_ratio = float(pe_ratio_raw)
        except (ValueError, TypeError):
            pe_ratio = None

        sector = (
            industry_info.get("macro")
            or industry_info.get("sector")
            or get_sector(symbol)
        )

        company_name = (
            info.get("companyName")
            or metadata.get("companyName")
            or symbol.upper()
        )

        return LivePriceResponse(
            symbol=symbol.upper(),
            company_name=company_name,
            last_price=round(last_price, 2),
            change=round(change, 2),
            pct_change=round(pct_change, 2),
            day_high=round(day_high, 2) if day_high else None,
            day_low=round(day_low, 2) if day_low else None,
            year_high=round(year_high, 2) if year_high else None,
            year_low=round(year_low, 2) if year_low else None,
            volume=volume,
            market_cap=market_cap,
            pe_ratio=round(pe_ratio, 2) if pe_ratio else None,
            sector=sector,
        )
    except Exception as e:
        logger.error("Failed to parse NSE response for %s: %s", symbol, e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not parse NSE data for symbol {symbol.upper()}.",
        )


# ---------------------------------------------------------------------------
# CSV Parsing
# ---------------------------------------------------------------------------

GROWW_CSV_COLUMNS = {
    "Stock Symbol": "symbol",
    "Company Name": "company_name",
    "Qty.": "quantity",
    "Avg. Cost": "avg_cost",
    "LTP": "ltp",
}


def parse_groww_csv(content: str) -> tuple[List[Dict[str, Any]], List[str]]:
    """
    Parse Groww export CSV file.
    Expected columns: Stock Symbol, Company Name, Qty., Avg. Cost, LTP
    Returns (records, errors) tuple.
    """
    records: List[Dict[str, Any]] = []
    errors: List[str] = []

    # Strip BOM if present
    content = content.lstrip("\ufeff").strip()
    if not content:
        errors.append("CSV file is empty.")
        return records, errors

    reader = csv.DictReader(io.StringIO(content))

    if reader.fieldnames is None:
        errors.append("Unable to read CSV headers.")
        return records, errors

    # Normalize headers
    normalized_headers = {h.strip().strip('"') for h in reader.fieldnames}
    required_columns = set(GROWW_CSV_COLUMNS.keys())
    missing = required_columns - normalized_headers
    if missing:
        errors.append(
            f"Missing required columns: {', '.join(sorted(missing))}. "
            f"Expected: {', '.join(sorted(required_columns))}."
        )
        return records, errors

    for row_num, row in enumerate(reader, start=2):
        try:
            # Strip whitespace and quotes from all values
            cleaned = {k.strip().strip('"'): str(v).strip().strip('"') for k, v in row.items() if k}

            symbol_raw = cleaned.get("Stock Symbol", "").upper().strip()
            company_name = cleaned.get("Company Name", "").strip()
            qty_raw = cleaned.get("Qty.", "").replace(",", "").strip()
            avg_cost_raw = cleaned.get("Avg. Cost", "").replace(",", "").replace("â¹", "").strip()
            ltp_raw = cleaned.get("LTP", "").replace(",", "").replace("â¹", "").strip()

            if not symbol_raw:
                errors.append(f"Row {row_num}: Empty stock symbol, skipping.")
                continue

            if not company_name:
                company_name = symbol_raw

            try:
                quantity = float(qty_raw)
                if quantity <= 0:
                    raise ValueError("Quantity must be positive")
            except ValueError as e:
                errors.append(f"Row {row_num} ({symbol_raw}): Invalid quantity '{qty_raw}' â {e}")
                continue

            try:
                avg_cost = float(avg_cost_raw)
                if avg_cost <= 0:
                    raise ValueError("Avg cost must be positive")
            except ValueError as e:
                errors.append(f"Row {row_num} ({symbol_raw}): Invalid avg cost '{avg_cost_raw}' â {e}")
                continue

            ltp: Optional[float] = None
            if ltp_raw and ltp_raw not in ("-", "N/A", "NA", ""):
                try:
                    ltp = float(ltp_raw)
                    if ltp < 0:
                        ltp = None
                except ValueError:
                    logger.warning("Row %d: Could not parse LTP '%s'", row_num, ltp_raw)

            records.append(
                {
                    "symbol": symbol_raw,
                    "company_name": company_name,
                    "quantity": quantity,
                    "avg_cost": avg_cost,
                    "ltp": ltp,
                    "sector": get_sector(symbol_raw),
                    "exchange": "NSE",
                }
            )
        except Exception as e:
            errors.append(f"Row {row_num}: Unexpected error â {e}")
            logger.exception("Unexpected CSV parsing error at row %d", row_num)

    return records, errors


# ---------------------------------------------------------------------------
# Helper: get holding or 404
# ---------------------------------------------------------------------------

def get_holding_or_404(holding_id: int, db: Session) -> StockHolding:
    holding = db.query(StockHolding).filter(StockHolding.id == holding_id).first()
    if not holding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock holding with id={holding_id} not found.",
        )
    return holding


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/import-csv",
    response_model=ImportCSVResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Import stock holdings from Groww CSV export",
    description=(
        "Upload a CSV file exported from Groww. "
        "Expected columns: 'Stock Symbol', 'Company Name', 'Qty.', 'Avg. Cost', 'LTP'. "
        "Duplicate symbols are updated; new ones are inserted."
    ),
)
async def import_csv(
    file: UploadFile = File(..., description="Groww CSV export file"),
    db: Session = Depends(get_db),
) -> ImportCSVResponse:
    # Validate file type
    if file.content_type not in ("text/csv", "application/vnd.ms-excel", "text/plain", "application/octet-stream"):
        if not (file.filename and file.filename.lower().endswith(".csv")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type '{file.content_type}'. Please upload a CSV file.",
            )

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # Try UTF-8, fall back to latin-1
    try:
        content = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content = raw_bytes.decode("latin-1")

    records, parse_errors = parse_groww_csv(content)

    if not records and parse_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "CSV parsing failed.", "errors": parse_errors},
        )

    imported_count = 0
    skipped_count = 0
    db_errors: List[str] = []
    saved_holdings: List[StockHolding] = []

    for record in records:
        try:
            # Check for existing holding with same symbol
            existing = (
                db.query(StockHolding)
                .filter(StockHolding.symbol == record["symbol"])
                .first()
            )
            if existing:
                # Update existing holding
                existing.company_name = record["company_name"]
                existing.quantity = record["quantity"]
                existing.avg_cost = record["avg_cost"]
                if record["ltp"] is not None:
                    existing.ltp = record["ltp"]
                existing.sector = record["sector"]
                db.flush()
                saved_holdings.append(existing)
                imported_count += 1
            else:
                new_holding = StockHolding(**record)
                db.add(new_holding)
                db.flush()
                saved_holdings.append(new_holding)
                imported_count += 1
        except SQLAlchemyError as e:
            db.rollback()
            msg = f"DB error for symbol {record['symbol']}: {str(e)[:120]}"
            db_errors.append(msg)
            logger.error(msg)
            skipped_count += 1

    try:
        db.commit()
        for h in saved_holdings:
            db.refresh(h)
    except SQLAlchemyError as e:
        db.rollback()
        logger.error("Failed to commit CSV import: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database commit failed during CSV import.",
        )

    all_errors = parse_errors + db_errors

    return ImportCSVResponse(
        imported=imported_count,
        skipped=skipped_count,
        errors=all_errors,
        holdings=[StockHoldingResponse.from_orm_with_calc(h) for h in saved_holdings],
    )


@router.get(
    "/holdings",
    response_model=List[StockHoldingResponse],
    summary="Get all stock holdings",
    description="Returns all stock holdings stored in the database with P&L calculations.",
)
def get_holdings(db: Session = Depends(get_db)) -> List[StockHoldingResponse]:
    holdings = db.query(StockHolding).order_by(StockHolding.symbol).all()
    return [StockHoldingResponse.from_orm_with_calc(h) for h in holdings]


@router.get(
    "/price/{symbol}",
    response_model=LivePriceResponse,
    summary="Get live NSE stock price",
    description=(
        "Fetches real-time stock price from NSE India. "
        "Requires establishing a session by visiting NSE homepage first."
    ),
)
async def get_live_price(symbol: str) -> LivePriceResponse:
    if not symbol or len(symbol) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid stock symbol.",
        )

    symbol_clean = symbol.upper().strip()
    # Validate symbol characters
    if not all(c.isalnum() or c in ("-", "&") for c in symbol_clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Symbol '{symbol_clean}' contains invalid characters.",
        )

    nse_data = await fetch_nse_live_price(symbol_clean)
    return parse_nse_response(symbol_clean, nse_data)


@router.put(
    "/holdings/{holding_id}",
    response_model=StockHoldingResponse,
    summary="Update a stock holding",
    description="Update one or more fields of an existing stock holding.",
)
def update_holding(
    holding_id: int,
    payload: StockHoldingUpdate,
    db: Session = Depends(get_db),
) -> StockHoldingResponse:
    holding = get_holding_or_404(holding_id, db)

    update_data = payload.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update.",
        )

    for field, value in update_data.items():
        setattr(holding, field, value)

    # Auto-update sector if symbol changes
    if "symbol" in update_data and "sector" not in update_data:
        holding.sector = get_sector(update_data["symbol"])

    try:
        db.commit()
        db.refresh(holding)
    except SQLAlchemyError as e:
        db.rollback()
        logger.error("Failed to update holding id=%d: %s", holding_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while updating holding.",
        )

    return StockHoldingResponse.from_orm_with_calc(holding)


@router.delete(
    "/holdings/{holding_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a stock holding",
    description="Permanently removes a stock holding from the database.",
)
def delete_holding(
    holding_id: int,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    holding = get_holding_or_404(holding_id, db)
    symbol = holding.symbol

    try:
        db.delete(holding)
        db.commit()
    except SQLAlchemyError as e:
        db.rollback()
        logger.error("Failed to delete holding id=%d: %s", holding_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while deleting holding.",
        )

    return {
        "message": f"Holding for symbol '{symbol}' (id={holding_id}) deleted successfully.",
        "id": holding_id,
        "symbol": symbol,
    }


@router.get(
    "/sectors",
    response_model=List[SectorBreakdown],
    summary="Get sector-wise portfolio breakdown",
    description="Aggregates holdings by sector and returns invested value, current value, and weight.",
)
def get_sector_breakdown(db: Session = Depends(get_db)) -> List[SectorBreakdown]:
    holdings = db.query(StockHolding).all()

    if not holdings:
        return []

    # Aggregate by sector
    sector_map: Dict[str, Dict[str, Any]] = {}

    total_invested_all = 0.0
    total_current_all = 0.0

    for h in holdings:
        sector = h.sector or get_sector(h.symbol)
        invested = h.quantity * h.avg_cost
        current = (h.quantity * h.ltp) if h.ltp is not None else None

        total_invested_all += invested
        if current is not None:
            total_current_all += current

        if sector not in sector_map:
            sector_map[sector] = {
                "total_invested": 0.0,
                "total_current_value": 0.0,
                "has_current": False,
                "holding_count": 0,
                "symbols": [],
            }

        sector_map[sector]["total_invested"] += invested
        if current is not None:
            sector_map[sector]["total_current_value"] += current
            sector_map[sector]["has_current"] = True
        sector_map[sector]["holding_count"] += 1
        if h.symbol not in sector_map[sector]["symbols"]:
            sector_map[sector]["symbols"].append(h.symbol)

    # Build response sorted by total invested descending
    result: List[SectorBreakdown] = []
    for sector_name, agg in sorted(
        sector_map.items(), key=lambda x: x[1]["total_invested"], reverse=True
    ):
        invested = agg["total_invested"]
        current = agg["total_current_value"] if agg["has_current"] else None
        weight_pct = (
            round((invested / total_invested_all) * 100, 2)
            if total_invested_all > 0
            else None
        )
        result.append(
            SectorBreakdown(
                sector=sector_name,
                total_invested=round(invested, 2),
                total_current_value=round(current, 2) if current is not None else None,
                holding_count=agg["holding_count"],
                symbols=sorted(agg["symbols"]),
                weight_pct=weight_pct,
            )
        )

    return result
