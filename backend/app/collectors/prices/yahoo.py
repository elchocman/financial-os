import logging
import yfinance as yf

logger = logging.getLogger(__name__)


def get_price(ticker: str) -> float:
    """
    Get current price for any Yahoo Finance ticker.
    Tries fast_info first, then 5-day history.
    """
    stock = yf.Ticker(ticker)

    try:
        price = stock.fast_info.get("last_price")
        if price is not None:
            return float(price)
    except Exception:
        pass

    try:
        hist = stock.history(period="5d")
        if not hist.empty:
            return float(hist["Close"].dropna().iloc[-1])
    except Exception:
        pass

    raise RuntimeError(f"Could not fetch price for {ticker}")


def get_prices_bulk(tickers: list[str]) -> dict[str, float]:
    """
    Fetch prices for multiple tickers at once (more efficient than one-by-one).
    Returns dict of {ticker: price}. Missing tickers are omitted.
    """
    results = {}

    try:
        # yfinance bulk download
        data = yf.download(tickers, period="1d", auto_adjust=True, progress=False)
        if not data.empty and "Close" in data.columns:
            latest = data["Close"].iloc[-1]
            for ticker in tickers:
                if ticker in latest and latest[ticker] is not None:
                    results[ticker] = float(latest[ticker])
    except Exception as e:
        logger.warning(f"Bulk download failed: {e} — falling back to individual fetches")

    # Fallback for any missing tickers
    missing = [t for t in tickers if t not in results]
    for ticker in missing:
        try:
            results[ticker] = get_price(ticker)
        except Exception as e:
            logger.error(f"Could not fetch price for {ticker}: {e}")

    return results
