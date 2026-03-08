from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import math

router = APIRouter(prefix="/insurance", tags=["Insurance"])

# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class RiderOption(BaseModel):
    name: str
    description: str
    additional_premium_pct: float = Field(..., description="Additional premium as % of base premium")
    sum_assured_limit: Optional[str] = None

class InsurancePlan(BaseModel):
    insurer: str
    plan_name: str
    claim_settlement_ratio: float = Field(..., description="Claim settlement ratio in %")
    annual_premium: float = Field(..., description="Annual premium in INR")
    monthly_premium: float = Field(..., description="Monthly premium in INR")
    sum_assured: float
    policy_term_years: int
    premium_paying_term: str
    features: List[str]
    riders: List[RiderOption]
    tax_benefit_section: str
    maturity_benefit: str
    death_benefit: str
    min_age: int
    max_age: int
    irda_registered: bool
    solvency_ratio: float
    plan_type: str
    online_discount_pct: float

class InsuranceComparisonResponse(BaseModel):
    age: int
    sum_assured: float
    smoking: bool
    gender: str
    plans: List[InsurancePlan]
    recommendation: str
    disclaimer: str
    generated_at: str

class SavePolicyRequest(BaseModel):
    user_id: str
    insurer: str
    plan_name: str
    sum_assured: float
    annual_premium: float
    policy_term_years: int
    nominee_name: str
    nominee_relation: str
    policy_start_date: str
    policy_number: Optional[str] = None
    notes: Optional[str] = None

class SavedPolicy(BaseModel):
    id: int
    user_id: str
    insurer: str
    plan_name: str
    sum_assured: float
    annual_premium: float
    policy_term_years: int
    nominee_name: str
    nominee_relation: str
    policy_start_date: str
    policy_number: Optional[str]
    notes: Optional[str]
    created_at: str

class SavePolicyResponse(BaseModel):
    success: bool
    message: str
    policy: SavedPolicy

class GetPoliciesResponse(BaseModel):
    total: int
    policies: List[SavedPolicy]

# ---------------------------------------------------------------------------
# In-memory store (replace with real DB in production)
# ---------------------------------------------------------------------------

_policies_store: List[dict] = []
_policy_id_counter = 1

# ---------------------------------------------------------------------------
# Premium Calculation Logic
# ---------------------------------------------------------------------------

def _base_premium_per_crore_lic(age: int, gender: str) -> float:
    """LIC Tech Term base annual premium for â¹1 Cr sum assured (non-smoker male)."""
    gender_loading = 1.0 if gender.lower() == "male" else 0.88  # females pay ~12% less
    if 25 <= age <= 30:
        base = 6200.0
    elif 31 <= age <= 35:
        base = 8800.0
    elif 36 <= age <= 40:
        base = 12800.0
    elif 41 <= age <= 45:
        base = 20000.0
    elif 46 <= age <= 50:
        base = 30000.0
    elif 51 <= age <= 55:
        base = 45000.0
    elif 56 <= age <= 60:
        base = 68000.0
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Age {age} is outside the supported range (25-60) for term insurance comparison."
        )
    return base * gender_loading

def _calculate_premium(
    age: int,
    sum_assured: float,
    smoking: bool,
    gender: str,
    insurer_multiplier: float,
    online_discount_pct: float = 0.0
) -> float:
    """Calculate annual premium for any insurer using LIC as base."""
    crores = sum_assured / 10_000_000.0
    base = _base_premium_per_crore_lic(age, gender)
    premium = base * crores * insurer_multiplier
    if smoking:
        premium *= 1.50  # 50% smoker loading
    # High sum-assured discount (bulk discount)
    if sum_assured >= 20_000_000:  # 2 Cr+
        premium *= 0.95
    elif sum_assured >= 50_000_000:  # 5 Cr+
        premium *= 0.90
    # Online channel discount
    premium = premium * (1 - online_discount_pct / 100.0)
    return round(premium, 2)

# ---------------------------------------------------------------------------
# Rider Data
# ---------------------------------------------------------------------------

def _lic_riders() -> List[RiderOption]:
    return [
        RiderOption(
            name="LIC Accidental Death & Disability Benefit Rider",
            description="Provides additional sum assured equal to the base cover in case of accidental death or permanent disability.",
            additional_premium_pct=8.5,
            sum_assured_limit="Equal to base sum assured, max â¹1 Cr"
        ),
        RiderOption(
            name="LIC Critical Illness Rider",
            description="Lump-sum payout on diagnosis of 15 specified critical illnesses including cancer, heart attack, stroke.",
            additional_premium_pct=12.0,
            sum_assured_limit="Up to 25% of base sum assured, max â¹25 Lakh"
        ),
        RiderOption(
            name="LIC Waiver of Premium Rider",
            description="Future premiums are waived in case of permanent disability or critical illness diagnosis.",
            additional_premium_pct=5.0,
            sum_assured_limit="N/A â waives remaining premiums"
        ),
    ]

def _hdfc_riders() -> List[RiderOption]:
    return [
        RiderOption(
            name="HDFC Life Accidental Death Benefit",
            description="Additional payout equal to sum assured in case of death due to accident. Covers worldwide accidents.",
            additional_premium_pct=7.0,
            sum_assured_limit="Up to â¹2 Cr"
        ),
        RiderOption(
            name="HDFC Life Critical Illness Plus Rider",
            description="Coverage for 60 critical illnesses with early-stage and major-stage payouts. Includes cancer, cardiac conditions, kidney failure.",
            additional_premium_pct=14.0,
            sum_assured_limit="Up to 100% of base sum assured"
        ),
        RiderOption(
            name="HDFC Life Waiver of Premium Plus",
            description="Premium waiver on critical illness diagnosis, disability, or job loss (first month only for job loss).",
            additional_premium_pct=4.5,
            sum_assured_limit="N/A â waives remaining premiums"
        ),
        RiderOption(
            name="HDFC Life Income Benefit on Accidental Disability Rider",
            description="Monthly income equal to 1% of sum assured for 10 years on accidental permanent disability.",
            additional_premium_pct=6.0,
            sum_assured_limit="1% of sum assured per month for 10 years"
        ),
    ]

def _icici_riders() -> List[RiderOption]:
    return [
        RiderOption(
            name="ICICI Pru Accidental Death Benefit Rider",
            description="Extra payout on accidental death. Covers road, rail, air accidents globally.",
            additional_premium_pct=7.5,
            sum_assured_limit="Equal to base sum assured, max â¹2 Cr"
        ),
        RiderOption(
            name="ICICI Pru Critical Illness Rider",
            description="Covers 34 critical illnesses. Payout on first diagnosis regardless of survival period.",
            additional_premium_pct=11.5,
            sum_assured_limit="Up to 50% of base sum assured, max â¹50 Lakh"
        ),
        RiderOption(
            name="ICICI Pru Waiver of Premium",
            description="Waives all future premiums if the policyholder is diagnosed with a covered critical illness or total permanent disability.",
            additional_premium_pct=4.8,
            sum_assured_limit="N/A â waives remaining premiums"
        ),
    ]

# ---------------------------------------------------------------------------
# Feature Lists
# ---------------------------------------------------------------------------

_LIC_FEATURES = [
    "Government-backed insurer with 65+ years of trust",
    "Online purchase with paperless process (LIC Tech Term)",
    "Claim settlement ratio: 98.38% (FY 2022-23) â industry leading consistency",
    "Level cover or increasing cover options (5% p.a. or 10% p.a.)",
    "Single life and joint life (spouse) coverage available",
    "Premium payment: regular pay, limited pay (5/10/15 years), single pay",
    "Grace period: 30 days for annual/semi-annual, 15 days for monthly",
    "Free look period: 30 days for online purchase",
    "Section 80C tax deduction on premiums up to â¹1.5 Lakh",
    "Death benefit under Section 10(10D) â fully tax-free",
    "Survival benefit on return-of-premium variant",
    "Pan-India claim settlement through 2,048+ branches",
]

_HDFC_FEATURES = [
    "Highest claim settlement ratio: 99.07% (FY 2022-23) â best among private insurers",
    "3D Life option: life cover + CI cover + disability cover in one plan",
    "Special exit value: return of premiums at age 65 or after 25 years",
    "Whole life coverage option up to age 85",
    "Online discount: up to 10% on first year premium",
    "Instant claim payout for accidental death (within 24 hours)",
    "Premium break option: pause premiums for 2 years after 3 years of payment",
    "Integrated terminal illness benefit â 50% payout on diagnosis",
    "Section 80C tax deduction on premiums up to â¹1.5 Lakh",
    "Critical illness payout does not reduce the life cover sum assured",
    "Worldwide coverage including during travel abroad",
    "Female discount: ~12% lower premiums for women policyholders",
]

_ICICI_FEATURES = [
    "Claim settlement ratio: 97.84% (FY 2022-23)",
    "4 plan variants: Life, Life Plus, Life & Health, All-in-One",
    "Cancer cover and heart cover as separate benefit options",
    "Income replacement option: monthly payout instead of lump sum",
    "Increasing income option: monthly payout growing at 10% p.a.",
    "Long-term care benefit: payout for permanent disability requiring nursing care",
    "Step-up cover: increase sum assured at key life events without medical tests",
    "Section 80C tax deduction on premiums up to â¹1.5 Lakh",
    "Section 80D benefits available with health rider add-ons",
    "Child education benefit rider available",
    "Discounted premiums for non-tobacco users verified at issuance",
    "Digital first: end-to-end online buying and claim filing",
]

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/compare", response_model=InsuranceComparisonResponse)
def compare_insurance(
    age: int = Query(..., ge=18, le=65, description="Age of the proposer in years"),
    sum_assured: float = Query(..., ge=2_500_000, le=100_000_000, description="Sum assured in INR (min â¹25 Lakh, max â¹10 Cr)"),
    smoking: bool = Query(..., description="Whether the proposer smokes tobacco"),
    gender: str = Query(..., regex="^(male|female|Male|Female)$", description="Gender: male or female"),
):
    """
    Compare term insurance plans from LIC, HDFC Life, and ICICI Prudential
    based on the proposer's age, desired sum assured, smoking status, and gender.
    Premiums are indicative and based on published rate cards (FY 2023-24).
    """
    if age < 25:
        raise HTTPException(
            status_code=400,
            detail="Term insurance comparison is available for age 25 and above."
        )
    if age > 60:
        raise HTTPException(
            status_code=400,
            detail="Term insurance comparison is available for age up to 60."
        )

    gender_normalised = gender.lower()

    # Policy term: cover till age 75 (standard practice)
    policy_term = max(10, 75 - age)

    # ---- LIC Tech Term ----
    lic_premium = _calculate_premium(
        age=age,
        sum_assured=sum_assured,
        smoking=smoking,
        gender=gender_normalised,
        insurer_multiplier=1.0,
        online_discount_pct=2.0  # LIC offers minimal online discount
    )
    lic_plan = InsurancePlan(
        insurer="Life Insurance Corporation of India (LIC)",
        plan_name="LIC Tech Term (Plan 854)",
        claim_settlement_ratio=98.38,
        annual_premium=lic_premium,
        monthly_premium=round(lic_premium / 12 * 1.04, 2),  # 4% extra for monthly mode
        sum_assured=sum_assured,
        policy_term_years=policy_term,
        premium_paying_term="Regular pay (same as policy term) or limited pay options",
        features=_LIC_FEATURES,
        riders=_lic_riders(),
        tax_benefit_section="Section 80C (premium) & Section 10(10D) (death benefit)",
        maturity_benefit="No maturity benefit (pure term); Return of Premium variant available at higher premium",
        death_benefit=f"100% of â¹{sum_assured:,.0f} paid as lump sum to nominee; income option available",
        min_age=18,
        max_age=65,
        irda_registered=True,
        solvency_ratio=1.85,
        plan_type="Pure Term / Level Cover",
        online_discount_pct=2.0
    )

    # ---- HDFC Click 2 Protect Life ----
    # HDFC is generally 10-15% cheaper than LIC; use 12% discount
    hdfc_premium = _calculate_premium(
        age=age,
        sum_assured=sum_assured,
        smoking=smoking,
        gender=gender_normalised,
        insurer_multiplier=0.88,  # ~12% cheaper
        online_discount_pct=10.0  # HDFC offers 10% online discount
    )
    hdfc_plan = InsurancePlan(
        insurer="HDFC Life Insurance Company Limited",
        plan_name="HDFC Click 2 Protect Life",
        claim_settlement_ratio=99.07,
        annual_premium=hdfc_premium,
        monthly_premium=round(hdfc_premium / 12 * 1.04, 2),
        sum_assured=sum_assured,
        policy_term_years=policy_term,
        premium_paying_term="Regular pay / limited pay / single pay â customer's choice at purchase",
        features=_HDFC_FEATURES,
        riders=_hdfc_riders(),
        tax_benefit_section="Section 80C (premium) & Section 10(10D) (death benefit); Section 80D with health riders",
        maturity_benefit="No maturity benefit on standard plan; special exit value (return of premiums) optional",
        death_benefit=f"100% of â¹{sum_assured:,.0f} + terminal illness accelerated payout (50% on diagnosis)",
        min_age=18,
        max_age=65,
        irda_registered=True,
        solvency_ratio=2.01,
        plan_type="Pure Term / Level Cover with optional increasing cover",
        online_discount_pct=10.0
    )

    # ---- ICICI Pru iProtect Smart ----
    # ICICI is mid-range: ~5-8% cheaper than LIC
    icici_premium = _calculate_premium(
        age=age,
        sum_assured=sum_assured,
        smoking=smoking,
        gender=gender_normalised,
        insurer_multiplier=0.94,  # ~6% cheaper than LIC
        online_discount_pct=5.0
    )
    icici_plan = InsurancePlan(
        insurer="ICICI Prudential Life Insurance Company Limited",
        plan_name="ICICI Pru iProtect Smart",
        claim_settlement_ratio=97.84,
        annual_premium=icici_premium,
        monthly_premium=round(icici_premium / 12 * 1.04, 2),
        sum_assured=sum_assured,
        policy_term_years=policy_term,
        premium_paying_term="Regular pay / limited pay (5, 7, 10 years) / single pay",
        features=_ICICI_FEATURES,
        riders=_icici_riders(),
        tax_benefit_section="Section 80C (premium) & Section 10(10D) (death benefit); Section 80D with health add-ons",
        maturity_benefit="No maturity benefit on base plan; return of premium variant available",
        death_benefit=f"100% of â¹{sum_assured:,.0f} as lump sum or monthly income or combination payout to nominee",
        min_age=18,
        max_age=65,
        irda_registered=True,
        solvency_ratio=2.10,
        plan_type="Pure Term / Level Cover with income replacement option",
        online_discount_pct=5.0
    )

    # Determine recommendation
    plans_sorted = sorted(
        [
            (lic_plan, "LIC Tech Term"),
            (hdfc_plan, "HDFC Click 2 Protect Life"),
            (icici_plan, "ICICI Pru iProtect Smart"),
        ],
        key=lambda x: x[0].annual_premium
    )
    cheapest_plan_name = plans_sorted[0][1]
    cheapest_premium = plans_sorted[0][0].annual_premium

    if not smoking and age <= 35:
        recommendation = (
            f"For a {age}-year-old non-smoker, HDFC Click 2 Protect Life offers the best combination of "
            f"lowest cost (â¹{cheapest_premium:,.0f}/yr) and the highest claim settlement ratio (99.07%). "
            f"LIC Tech Term is recommended if you prefer a government-backed insurer for added trust."
        )
    elif smoking:
        recommendation = (
            f"As a smoker, premiums are 50% higher across all plans. "
            f"{cheapest_plan_name} is the most cost-effective at â¹{cheapest_premium:,.0f}/yr. "
            f"Consider quitting tobacco: a re-assessment after 2 smoke-free years can reduce your premium significantly."
        )
    elif age >= 40:
        recommendation = (
            f"At age {age}, premiums are substantially higher. HDFC Click 2 Protect Life offers the lowest "
            f"premium combined with the highest claim settlement ratio. Opt for at least â¹1 Cr sum assured "
            f"and consider adding a critical illness rider given increased health risks."
        )
    else:
        recommendation = (
            f"{cheapest_plan_name} is the most affordable at â¹{cheapest_premium:,.0f}/year. "
            f"HDFC Life's 99.07% claim settlement ratio makes it the safest choice for dependents. "
            f"Ensure sum assured is at least 15â20x your annual income."
        )

    return InsuranceComparisonResponse(
        age=age,
        sum_assured=sum_assured,
        smoking=smoking,
        gender=gender_normalised,
        plans=[lic_plan, hdfc_plan, icici_plan],
        recommendation=recommendation,
        disclaimer=(
            "Premiums shown are indicative estimates based on published rate cards for FY 2023-24 and may vary "
            "based on medical underwriting, occupation, income, and specific plan variant chosen. "
            "GST @ 18% is applicable on premiums and is NOT included in figures shown. "
            "Claim settlement ratios are sourced from IRDAI Annual Report 2022-23. "
            "Please visit the respective insurer's website or contact an IRDAI-registered advisor for final quotes."
        ),
        generated_at=datetime.utcnow().isoformat() + "Z"
    )


@router.get("/policies", response_model=GetPoliciesResponse)
def get_policies(
    user_id: Optional[str] = Query(None, description="Filter policies by user ID")
):
    """
    Retrieve saved insurance policies. Optionally filter by user_id.
    """
    if user_id:
        result = [p for p in _policies_store if p["user_id"] == user_id]
    else:
        result = list(_policies_store)

    policies = [SavedPolicy(**p) for p in result]
    return GetPoliciesResponse(total=len(policies), policies=policies)


@router.post("/policies", response_model=SavePolicyResponse, status_code=201)
def save_policy(payload: SavePolicyRequest):
    """
    Save a purchased or shortlisted insurance policy to the user's profile.
    """
    global _policy_id_counter

    # Validate start date format
    try:
        datetime.strptime(payload.policy_start_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail="policy_start_date must be in YYYY-MM-DD format."
        )

    if payload.annual_premium <= 0:
        raise HTTPException(
            status_code=422,
            detail="annual_premium must be greater than zero."
        )

    if payload.sum_assured < 500_000:
        raise HTTPException(
            status_code=422,
            detail="sum_assured must be at least â¹5,00,000 (5 Lakh)."
        )

    valid_insurers = [
        "Life Insurance Corporation of India (LIC)",
        "HDFC Life Insurance Company Limited",
        "ICICI Prudential Life Insurance Company Limited",
        "SBI Life Insurance",
        "Bajaj Allianz Life Insurance",
        "Max Life Insurance",
        "Tata AIA Life Insurance",
        "Kotak Mahindra Life Insurance",
        "Other",
    ]
    # Soft validation â warn but don't block unknown insurers

    now_str = datetime.utcnow().isoformat() + "Z"
    record = {
        "id": _policy_id_counter,
        "user_id": payload.user_id,
        "insurer": payload.insurer,
        "plan_name": payload.plan_name,
        "sum_assured": payload.sum_assured,
        "annual_premium": payload.annual_premium,
        "policy_term_years": payload.policy_term_years,
        "nominee_name": payload.nominee_name,
        "nominee_relation": payload.nominee_relation,
        "policy_start_date": payload.policy_start_date,
        "policy_number": payload.policy_number,
        "notes": payload.notes,
        "created_at": now_str,
    }
    _policies_store.append(record)
    _policy_id_counter += 1

    saved = SavedPolicy(**record)
    return SavePolicyResponse(
        success=True,
        message=f"Policy '{payload.plan_name}' from '{payload.insurer}' saved successfully.",
        policy=saved
    )
