from sqlalchemy import Column, Integer, String, Float, DateTime, Text, func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class MFHolding(Base):
    __tablename__ = "mf_holdings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    scheme_code = Column(String(50), nullable=False, index=True)
    scheme_name = Column(String(255), nullable=False)
    folio_number = Column(String(100), nullable=False)
    category = Column(String(20), nullable=False)  # Equity / Debt / Hybrid
    units = Column(Float, nullable=False, default=0.0)
    nav = Column(Float, nullable=False, default=0.0)
    invested_value = Column(Float, nullable=False, default=0.0)
    current_value = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<MFHolding id={self.id} scheme_code={self.scheme_code!r} "
            f"folio={self.folio_number!r} units={self.units} nav={self.nav}>"
        )


class StockHolding(Base):
    __tablename__ = "stock_holdings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    symbol = Column(String(50), nullable=False, index=True)
    company_name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    avg_price = Column(Float, nullable=False, default=0.0)
    current_price = Column(Float, nullable=False, default=0.0)
    sector = Column(String(100), nullable=False)
    imported_from = Column(String(50), nullable=False, default="manual")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<StockHolding id={self.id} symbol={self.symbol!r} "
            f"qty={self.quantity} avg_price={self.avg_price} current_price={self.current_price}>"
        )


class InsurancePolicy(Base):
    __tablename__ = "insurance_policies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    insurer = Column(String(255), nullable=False)
    plan_name = Column(String(255), nullable=False)
    sum_assured = Column(Float, nullable=False, default=0.0)
    annual_premium = Column(Float, nullable=False, default=0.0)
    policy_term = Column(Integer, nullable=False, default=0)  # in years
    claim_settlement_ratio = Column(Float, nullable=False, default=0.0)  # percentage 0-100
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return (
            f"<InsurancePolicy id={self.id} insurer={self.insurer!r} "
            f"plan={self.plan_name!r} sum_assured={self.sum_assured}>"
        )


class TaxCalculation(Base):
    __tablename__ = "tax_calculations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    gross_income = Column(Float, nullable=False, default=0.0)
    regime = Column(String(10), nullable=False)  # old / new
    total_deductions = Column(Float, nullable=False, default=0.0)
    taxable_income = Column(Float, nullable=False, default=0.0)
    tax_payable = Column(Float, nullable=False, default=0.0)
    cess = Column(Float, nullable=False, default=0.0)  # Health & Education Cess (4%)
    total_tax = Column(Float, nullable=False, default=0.0)  # tax_payable + cess
    calculated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return (
            f"<TaxCalculation id={self.id} regime={self.regime!r} "
            f"gross_income={self.gross_income} total_tax={self.total_tax}>"
        )


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_message = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    context = Column(Text, nullable=True)  # optional serialised context / metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        preview = self.user_message[:60].replace("\n", " ")
        return f"<ChatHistory id={self.id} user_message={preview!r}>"
