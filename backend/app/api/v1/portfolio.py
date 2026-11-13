from fastapi import APIRouter, HTTPException, Query, Depends
from datetime import datetime

from app.api.v1.deps import get_current_user

from app.services.portfolio_service import (
    build_portfolio_summary,
    build_portfolio_allocation,
    get_all_holdings,
)
from app.services.networth_service import save_daily_snapshot
from app.services.pnl_service import get_portfolio_performance, get_performance_chart
from app.repositories.holdings_repo import get_price_history, get_fx_rate_history
from app.config import get_settings
from app.models.schemas import (
    PortfolioSummary,
    PortfolioAllocation,
    PortfolioPerformance,
    PerformanceDataPoint,
    PriceHistory,
    PriceRecord,
    SyncResult,
    WorkerRunResult,
    IntegrationStatus,
    IntegrationsStatus,
)

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


@router.get("/", response_model=PortfolioSummary)
async def get_portfolio(current_user: dict = Depends(get_current_user)):
    """
    Investments Engine — full portfolio with live prices.
    Returns all holdings grouped by platform with current valuations.
    """
    try:
        return build_portfolio_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/allocation", response_model=PortfolioAllocation)
async def get_allocation(current_user: dict = Depends(get_current_user)):
    """
    Portfolio allocation breakdown.
    Returns percentage split by platform and by asset class.
    """
    try:
        holdings = get_all_holdings()
        return build_portfolio_allocation(holdings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance", response_model=PortfolioPerformance)
async def get_performance(current_user: dict = Depends(get_current_user)):
    """
    PnL and performance metrics for all holdings.
    Shows unrealized gain/loss per position (requires avg_cost to be set).
    """
    try:
        return get_portfolio_performance()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance/chart", response_model=list[PerformanceDataPoint])
async def get_performance_chart_data(
    current_user: dict = Depends(get_current_user),
    days: int = Query(default=90, ge=7, le=365)
):
    """
    Historical portfolio value as a time series.
    Uses net worth snapshots — one data point per day.
    """
    try:
        return get_performance_chart(days=days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prices/{ticker}", response_model=PriceHistory)
async def get_ticker_price_history(
    ticker: str,
    current_user: dict = Depends(get_current_user),
    days: int = Query(default=30, ge=1, le=365),
):
    """
    Price history for a specific ticker from the local DB cache.
    """
    try:
        records = get_price_history(ticker.upper(), days=days)
        return PriceHistory(
            ticker=ticker.upper(),
            data=[
                PriceRecord(
                    ticker=r["ticker"],
                    price=r["price"],
                    currency=r["currency"],
                    source=r.get("source", "yahoo"),
                    fetched_at=r["fetched_at"],
                )
                for r in records
            ],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fx-history", response_model=list[dict])
async def get_fx_history(
    current_user: dict = Depends(get_current_user),
    days: int = Query(default=30, ge=1, le=365),
    from_currency: str = Query(default="USD"),
    to_currency: str = Query(default="CLP"),
):
    """FX rate history for a currency pair."""
    try:
        return get_fx_rate_history(from_currency, to_currency, days=days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/integrations/status", response_model=IntegrationsStatus)
async def get_integrations_status(current_user: dict = Depends(get_current_user)):
    """Return connection status for all investment platforms."""
    settings = get_settings()

    has_binance_api = bool(settings.binance_api_key and settings.binance_api_secret)
    binance_mode = "api" if has_binance_api else ("manual" if settings.binance_btc_amount > 0 else "not_set")

    return IntegrationsStatus(
        fintual=IntegrationStatus(
            configured=bool(settings.fintual_email and settings.fintual_password),
            mode="api",
            detail=settings.fintual_email or None,
        ),
        racional=IntegrationStatus(
            configured=True,
            mode="db",
            detail="Holdings managed via UI",
        ),
        binance=IntegrationStatus(
            configured=has_binance_api or settings.binance_btc_amount > 0,
            mode=binance_mode,
            detail="API keys configured" if has_binance_api else (f"{settings.binance_btc_amount} BTC (manual)" if settings.binance_btc_amount > 0 else None),
        ),
    )


@router.post("/sync", response_model=SyncResult)
async def sync_portfolio(current_user: dict = Depends(get_current_user)):
    """
    Manually trigger a full portfolio sync:
    1. Fetch live holdings from all platforms
    2. Persist holdings to DB
    3. Update prices
    4. Save net worth snapshot
    """
    try:
        # Run all workers in sequence
        from app.workers.fx_updater import run as run_fx
        from app.workers.price_updater import run as run_prices
        from app.workers.portfolio_sync import run as run_sync

        run_fx()
        run_prices()
        run_sync()
        save_daily_snapshot(current_user["id"])

        return SyncResult(
            success=True,
            message="Portfolio synced: holdings, prices, FX, and snapshot updated",
            timestamp=datetime.utcnow(),
        )
    except Exception as e:
        return SyncResult(
            success=False,
            message=str(e),
            timestamp=datetime.utcnow(),
        )
