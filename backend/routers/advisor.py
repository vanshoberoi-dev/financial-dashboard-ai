import os
import logging
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from database import get_db
from models import ChatHistory, User
from auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/advisor", tags=["AI Financial Advisor"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not set. AI advisor will be unavailable.")
else:
    genai.configure(api_key=GEMINI_API_KEY)

SYSTEM_PROMPT = """You are Finora, an expert Indian financial advisor. You understand Indian tax laws (Income Tax Act), SEBI regulations, mutual funds (AMFI categories), insurance (IRDAI), and the Indian stock market (NSE/BSE). Provide specific, actionable advice in a friendly tone. Always mention relevant sections/regulations. Amounts should be in INR. Disclaimer when needed.

Key areas of expertise:
- Income Tax: Sections 80C, 80D, 80E, 80G, 24(b), capital gains (STCG/LTCG), TDS, ITR filing
- Investments: Mutual funds (ELSS, debt, equity, hybrid), SIP, lump sum, SWP, direct vs regular plans
- Stock Market: NSE/BSE, Sensex, Nifty, F&O, circuit breakers, SEBI regulations
- Insurance: Term life (IRDAI guidelines), health insurance (floater/individual), ULIP, endowment
- Retirement: NPS (National Pension System), EPF, PPF, Senior Citizen Savings Scheme
- Banking: FD rates, RBI repo rate impact, savings account interest, NBFC regulations
- Real Estate: Home loan tax benefits, RERA, stamp duty, registration
- Compliance: PAN, Aadhaar linking, FATCA, KYC norms

Always:
1. Cite specific sections of relevant Acts or SEBI/IRDAI/RBI circulars when applicable
2. Use INR (\u20b9) for all monetary values
3. Add disclaimers for investment advice: 'Past performance is not indicative of future results. Please consult a SEBI-registered investment advisor for personalized advice.'
4. Consider the user's financial context if provided
5. Be concise but comprehensive"""

INDIAN_FINANCE_SOURCES = [
    "Income Tax Act, 1961",
    "SEBI (Securities and Exchange Board of India)",
    "AMFI (Association of Mutual Funds in India)",
    "IRDAI (Insurance Regulatory and Development Authority of India)",
    "RBI (Reserve Bank of India)",
    "NSE (National Stock Exchange)",
    "BSE (Bombay Stock Exchange)",
    "PFRDA (Pension Fund Regulatory and Development Authority)",
    "Ministry of Finance, Government of India",
    "RERA (Real Estate Regulatory Authority)",
]

SOURCE_KEYWORDS = {
    "income tax": ["Income Tax Act, 1961", "CBDT Guidelines"],
    "section 80c": ["Income Tax Act, 1961 - Section 80C"],
    "section 80d": ["Income Tax Act, 1961 - Section 80D"],
    "capital gain": ["Income Tax Act, 1961 - Sections 111A & 112A", "SEBI (Securities and Exchange Board of India)"],
    "mutual fund": ["AMFI (Association of Mutual Funds in India)", "SEBI (Mutual Funds) Regulations, 1996"],
    "sip": ["AMFI (Association of Mutual Funds in India)", "SEBI (Mutual Funds) Regulations, 1996"],
    "elss": ["Income Tax Act, 1961 - Section 80C", "AMFI (Association of Mutual Funds in India)"],
    "insurance": ["IRDAI (Insurance Regulatory and Development Authority of India)", "Insurance Act, 1938"],
    "term life": ["IRDAI (Insurance Regulatory and Development Authority of India)"],
    "health insurance": ["IRDAI (Insurance Regulatory and Development Authority of India)", "Income Tax Act, 1961 - Section 80D"],
    "nps": ["PFRDA (Pension Fund Regulatory and Development Authority)", "Income Tax Act, 1961 - Section 80CCD"],
    "epf": ["Employees' Provident Funds and Miscellaneous Provisions Act, 1952"],
    "ppf": ["Public Provident Fund Scheme, 2019", "Income Tax Act, 1961 - Section 80C"],
    "stock": ["SEBI (Securities and Exchange Board of India)", "NSE (National Stock Exchange)", "BSE (Bombay Stock Exchange)"],
    "sebi": ["SEBI (Securities and Exchange Board of India)"],
    "nse": ["NSE (National Stock Exchange)"],
    "bse": ["BSE (Bombay Stock Exchange)"],
    "home loan": ["Income Tax Act, 1961 - Section 24(b)", "RBI (Reserve Bank of India) Housing Finance Guidelines"],
    "real estate": ["RERA (Real Estate Regulatory Authority)", "Income Tax Act, 1961"],
    "rbi": ["RBI (Reserve Bank of India)"],
    "fd": ["RBI (Reserve Bank of India) Banking Regulations"],
    "fixed deposit": ["RBI (Reserve Bank of India) Banking Regulations", "Income Tax Act, 1961 - Section 80C (Tax Saver FD)"],
    "pan": ["Income Tax Act, 1961 - Section 139A"],
    "gst": ["Goods and Services Tax Act, 2017"],
    "itr": ["Income Tax Act, 1961", "CBDT Guidelines"],
    "tds": ["Income Tax Act, 1961 - Chapter XVII"],
    "demat": ["SEBI (Depositories and Participants) Regulations, 2018"],
    "nifty": ["NSE (National Stock Exchange)"],
    "sensex": ["BSE (Bombay Stock Exchange)"],
    "futures": ["SEBI (Stock Brokers) Regulations, 1992"],
    "options": ["SEBI (Stock Brokers) Regulations, 1992"],
    "ipo": ["SEBI (Issue of Capital and Disclosure Requirements) Regulations, 2018"],
    "dividend": ["Income Tax Act, 1961 - Section 194", "Companies Act, 2013"],
    "senior citizen": ["Senior Citizens Savings Scheme, 2004", "Income Tax Act, 1961 - Section 80TTB"],
    "sukanya": ["Sukanya Samriddhi Account Rules, 2016", "Income Tax Act, 1961 - Section 80C"],
    "gratuity": ["Payment of Gratuity Act, 1972", "Income Tax Act, 1961 - Section 10(10)"],
    "hra": ["Income Tax Act, 1961 - Section 10(13A)"],
    "ltcg": ["Income Tax Act, 1961 - Section 112A"],
    "stcg": ["Income Tax Act, 1961 - Section 111A"],
}


class AdvisorRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000, description="The financial question to ask Finora")
    context: Optional[str] = Field(None, max_length=5000, description="Optional portfolio or financial context")


class AdvisorResponse(BaseModel):
    answer: str = Field(..., description="AI-generated financial advice")
    sources: List[str] = Field(default_factory=list, description="Relevant regulatory sources cited")
    question: str = Field(..., description="The original question asked")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    disclaimer: str = Field(
        default="This is AI-generated information for educational purposes only. It does not constitute financial, legal, or tax advice. Please consult a SEBI-registered investment advisor, chartered accountant, or licensed insurance advisor for personalized advice.",
        description="Standard disclaimer"
    )


class ChatHistoryResponse(BaseModel):
    id: int
    question: str
    answer: str
    sources: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


def extract_relevant_sources(question: str, answer: str) -> List[str]:
    """Extract relevant regulatory sources based on question and answer content."""
    combined_text = (question + " " + answer).lower()
    relevant_sources = set()

    for keyword, sources in SOURCE_KEYWORDS.items():
        if keyword in combined_text:
            for source in sources:
                relevant_sources.add(source)

    if not relevant_sources:
        if any(word in combined_text for word in ["invest", "return", "profit", "loss", "portfolio"]):
            relevant_sources.update([
                "SEBI (Securities and Exchange Board of India)",
                "AMFI (Association of Mutual Funds in India)",
            ])
        else:
            relevant_sources.add("Ministry of Finance, Government of India")

    return sorted(list(relevant_sources))


def build_prompt(question: str, context: Optional[str]) -> str:
    """Build the full prompt including context if provided."""
    prompt_parts = []

    if context:
        prompt_parts.append("=== USER'S FINANCIAL CONTEXT ===")
        prompt_parts.append(context.strip())
        prompt_parts.append("=" * 40)
        prompt_parts.append("")

    prompt_parts.append("=== USER QUESTION ===")
    prompt_parts.append(question.strip())
    prompt_parts.append("")
    prompt_parts.append("Please provide a detailed, actionable response with relevant Indian financial regulations, sections, and practical steps.")

    return "\n".join(prompt_parts)


def get_gemini_model():
    """Initialize and return the Gemini model."""
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI advisor is currently unavailable. GEMINI_API_KEY not configured."
        )

    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=SYSTEM_PROMPT,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                top_p=0.9,
                top_k=40,
                max_output_tokens=2048,
            ),
            safety_settings={
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }
        )
        return model
    except Exception as e:
        logger.error(f"Failed to initialize Gemini model: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to initialize AI model. Please try again later."
        )


@router.post("/ask", response_model=AdvisorResponse, status_code=status.HTTP_200_OK)
async def ask_advisor(
    request: AdvisorRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ask Finora, the AI Indian financial advisor, a question.

    Optionally provide financial context (portfolio summary, income details, etc.)
    to get more personalized advice.

    Responses are stored in chat history for future reference.
    """
    if not request.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty."
        )

    model = get_gemini_model()
    full_prompt = build_prompt(request.question, request.context)

    try:
        logger.info(f"User {current_user.id} asking advisor: {request.question[:100]}...")
        response = model.generate_content(full_prompt)

        if not response or not response.text:
            logger.error(f"Empty response from Gemini for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI advisor returned an empty response. Please rephrase your question and try again."
            )

        answer_text = response.text.strip()

        if response.prompt_feedback and hasattr(response.prompt_feedback, 'block_reason') and response.prompt_feedback.block_reason:
            logger.warning(f"Prompt blocked for user {current_user.id}: {response.prompt_feedback.block_reason}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your question was flagged by the safety filter. Please rephrase and try again."
            )

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Gemini API error for user {current_user.id}: {error_msg}")

        if "quota" in error_msg.lower() or "rate" in error_msg.lower() or "429" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="AI advisor is temporarily overloaded. Please try again in a few moments."
            )
        elif "invalid api key" in error_msg.lower() or "api_key" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI advisor authentication failed. Please contact support."
            )
        elif "deadline" in error_msg.lower() or "timeout" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="AI advisor request timed out. Please try again."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI advisor encountered an error. Please try again later."
            )

    sources = extract_relevant_sources(request.question, answer_text)

    try:
        chat_record = ChatHistory(
            user_id=current_user.id,
            question=request.question,
            answer=answer_text,
            sources=sources,
            context_provided=bool(request.context),
            created_at=datetime.utcnow()
        )
        db.add(chat_record)
        db.commit()
        db.refresh(chat_record)
        logger.info(f"Chat history saved for user {current_user.id}, record ID: {chat_record.id}")
    except Exception as db_err:
        logger.error(f"Failed to save chat history for user {current_user.id}: {db_err}")
        db.rollback()

    return AdvisorResponse(
        answer=answer_text,
        sources=sources,
        question=request.question,
        timestamp=datetime.utcnow()
    )


@router.get("/history", response_model=List[ChatHistoryResponse], status_code=status.HTTP_200_OK)
async def get_chat_history(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve the current user's chat history with the AI advisor.

    Returns paginated list of past questions and answers, most recent first.
    """
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 100."
        )
    if offset < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Offset must be non-negative."
        )

    try:
        history = (
            db.query(ChatHistory)
            .filter(ChatHistory.user_id == current_user.id)
            .order_by(ChatHistory.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return history
    except Exception as e:
        logger.error(f"Failed to retrieve chat history for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve chat history."
        )


@router.delete("/history/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_record(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a specific chat history record by ID.

    Users can only delete their own chat records.
    """
    try:
        record = (
            db.query(ChatHistory)
            .filter(
                ChatHistory.id == chat_id,
                ChatHistory.user_id == current_user.id
            )
            .first()
        )

        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chat record with ID {chat_id} not found or does not belong to you."
            )

        db.delete(record)
        db.commit()
        logger.info(f"Chat record {chat_id} deleted by user {current_user.id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete chat record {chat_id} for user {current_user.id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete chat record."
        )


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Clear all chat history for the current user.
    """
    try:
        deleted_count = (
            db.query(ChatHistory)
            .filter(ChatHistory.user_id == current_user.id)
            .delete(synchronize_session=False)
        )
        db.commit()
        logger.info(f"Cleared {deleted_count} chat records for user {current_user.id}")

    except Exception as e:
        logger.error(f"Failed to clear chat history for user {current_user.id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear chat history."
        )


@router.get("/topics", status_code=status.HTTP_200_OK)
async def get_suggested_topics():
    """
    Returns a list of suggested financial topics the user can ask about.
    """
    topics = [
        {
            "category": "Tax Planning",
            "questions": [
                "How can I save tax under Section 80C?",
                "What is the difference between old and new tax regime?",
                "How are mutual fund gains taxed in India?",
                "What is the LTCG tax rate for equity funds?",
                "How to claim HRA exemption?",
            ]
        },
        {
            "category": "Investments",
            "questions": [
                "What is the best way to start investing with \u20b95,000 per month?",
                "What is the difference between direct and regular mutual fund plans?",
                "How does SIP work and what are its benefits?",
                "What are ELSS funds and how do they help in tax saving?",
                "How should I diversify my investment portfolio?",
            ]
        },
        {
            "category": "Insurance",
            "questions": [
                "How much term life insurance coverage do I need?",
                "What is the difference between term and whole life insurance?",
                "How to choose a health insurance plan in India?",
                "What are the tax benefits of health insurance under Section 80D?",
                "Should I buy ULIP or separate term + mutual fund?",
            ]
        },
        {
            "category": "Retirement Planning",
            "questions": [
                "How does the National Pension System (NPS) work?",
                "What is the difference between EPF and PPF?",
                "How much should I save for retirement?",
                "What are the tax benefits of NPS under Section 80CCD?",
                "When can I withdraw from my EPF account?",
            ]
        },
        {
            "category": "Stock Market",
            "questions": [
                "How do I open a demat account in India?",
                "What are the SEBI regulations for retail investors?",
                "What is the difference between NSE and BSE?",
                "How are stock dividends taxed in India?",
                "What is the circuit breaker mechanism in Indian markets?",
            ]
        },
        {
            "category": "Home & Real Estate",
            "questions": [
                "What are the tax benefits on a home loan?",
                "How does RERA protect home buyers?",
                "What is the capital gains tax on property sale?",
                "Should I buy or rent a house in India?",
                "What is stamp duty and how is it calculated?",
            ]
        },
    ]
    return {"topics": topics, "total_categories": len(topics)}
