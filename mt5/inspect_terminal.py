"""Read-only MT5 terminal inventory. Never sends or modifies an order.

Run on Windows beside an already installed, already logged-in MT5 terminal.
The browser and cloud laboratory do not connect to MT5 through this tool.
"""
from __future__ import annotations

import importlib
import json
import math
import sys
import time
from typing import Any

EXPECTED_SERVER = "Deriv.com Limited"
EXPECTED_SYMBOLS = ("XAUSD", "NDAQ.QQ")
MAX_TICK_AGE_SECONDS = 60

SPEC_FIELDS = (
    "trade_contract_size", "trade_tick_size", "trade_tick_value",
    "trade_tick_value_profit", "trade_tick_value_loss", "volume_min",
    "volume_max", "volume_step", "trade_stops_level", "trade_freeze_level",
    "point", "digits", "trade_mode", "trade_calc_mode", "currency_base",
    "currency_profit", "currency_margin", "swap_mode", "swap_long",
    "swap_short", "swap_rollover3days", "commission", "commission_type",
)


def safe_value(value: Any) -> Any:
    """Only expose explicitly selected scalar properties, never SDK objects."""
    if value is None or isinstance(value, (bool, int)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, str):
        return value[:200]
    return None


def base_report() -> dict[str, Any]:
    return {
        "schema_version": 1,
        "project": "Cárdenas and Corp.",
        "mode": "read_only_terminal_inspection",
        "readiness_scope": "inspection_only_not_trading_authorization",
        "declared_broker": "Deriv",
        "expected_server": EXPECTED_SERVER,
        "expected_symbols": list(EXPECTED_SYMBOLS),
        "configuration_source": "user_provided_unverified",
        "prepared_for_demo": False,
        "orders_enabled": False,
        "terminal": {"initialized": False, "connected": False},
        "account": {"available": False, "is_demo": False, "server_matches": False},
        "symbols": [],
        "issues": [],
    }


def inspect_symbol(mt5: Any, symbol: str, now: float) -> dict[str, Any]:
    result: dict[str, Any] = {
        "requested_symbol": symbol,
        "found": False,
        "specification": {},
        "tick": None,
        "inspection_valid": False,
        "issues": [],
    }
    info = mt5.symbol_info(symbol)
    if info is None:
        result["issues"].append("exact_symbol_not_found_no_substitution")
        return result
    result["found"] = True
    # No symbol_select: changing Market Watch is deliberately excluded.
    result["specification"] = {
        field: safe_value(getattr(info, field, None)) for field in SPEC_FIELDS
    }
    s = result["specification"]
    required_positive = ("trade_contract_size", "trade_tick_size", "point",
                         "volume_min", "volume_max", "volume_step")
    if any(not isinstance(s[field], (int, float)) or s[field] <= 0
           for field in required_positive):
        result["issues"].append("incomplete_or_invalid_contract_specification")
    elif s["volume_min"] > s["volume_max"]:
        result["issues"].append("invalid_volume_range")
    if not isinstance(s["trade_tick_value"], (int, float)) or s["trade_tick_value"] <= 0:
        result["issues"].append("tick_value_unavailable_or_zero")
    if s["trade_mode"] != getattr(mt5, "SYMBOL_TRADE_MODE_FULL", 4):
        result["issues"].append("symbol_not_in_full_trade_mode")
    tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        result["issues"].append("tick_unavailable_without_market_watch_changes")
        return result
    timestamp = getattr(tick, "time_msc", 0)
    timestamp = timestamp / 1000 if isinstance(timestamp, (int, float)) and timestamp > 0 else getattr(tick, "time", None)
    valid_time = isinstance(timestamp, (int, float)) and math.isfinite(timestamp) and timestamp > 0
    age = now - timestamp if valid_time else None
    stale = age is None or age > MAX_TICK_AGE_SECONDS or age < -5
    result["tick"] = {
        "time_unix_seconds": safe_value(timestamp),
        "age_seconds": round(age, 3) if age is not None else None,
        "stale": stale,
        "maximum_age_seconds": MAX_TICK_AGE_SECONDS,
        "bid": safe_value(getattr(tick, "bid", None)),
        "ask": safe_value(getattr(tick, "ask", None)),
        "last": safe_value(getattr(tick, "last", None)),
    }
    if stale:
        result["issues"].append("tick_stale_missing_time_or_clock_skew")
    bid, ask = result["tick"]["bid"], result["tick"]["ask"]
    if (not isinstance(bid, (int, float)) or not isinstance(ask, (int, float))
            or bid <= 0 or ask < bid):
        result["issues"].append("invalid_bid_ask")
    result["inspection_valid"] = not result["issues"]
    return result


def inspect_terminal(mt5: Any, *, now: float | None = None) -> dict[str, Any]:
    """Use the terminal's existing session; no login or account switching."""
    report = base_report()
    initialized = False
    try:
        initialized = bool(mt5.initialize())
        report["terminal"]["initialized"] = initialized
        if not initialized:
            report["issues"].append("terminal_initialization_failed")
            return report
        terminal = mt5.terminal_info()
        connected = bool(terminal and getattr(terminal, "connected", False))
        report["terminal"]["connected"] = connected
        if not connected:
            report["issues"].append("terminal_not_connected")
        account = mt5.account_info()
        if account is None:
            report["issues"].append("existing_logged_in_account_unavailable")
        else:
            server = safe_value(getattr(account, "server", None))
            mode = safe_value(getattr(account, "trade_mode", None))
            is_demo = mode == getattr(mt5, "ACCOUNT_TRADE_MODE_DEMO", 0)
            server_matches = server == EXPECTED_SERVER
            report["account"] = {
                "available": True,
                "observed_server": server,
                "server_matches": server_matches,
                "trade_mode": mode,
                "is_demo": is_demo,
            }
            if not is_demo:
                report["issues"].append("account_is_not_confirmed_demo")
            if not server_matches:
                report["issues"].append("server_mismatch_no_automatic_substitution")
        timestamp = time.time() if now is None else now
        report["symbols"] = [inspect_symbol(mt5, symbol, timestamp) for symbol in EXPECTED_SYMBOLS]
        if any(not s["inspection_valid"] for s in report["symbols"]):
            report["issues"].append("one_or_more_instruments_require_review")
        report["prepared_for_demo"] = not report["issues"]
    except Exception:
        # SDK exception text and last_error() may include local/customer details.
        # Never echo them or serialize account/terminal objects.
        report["issues"].append("terminal_inspection_failed_details_redacted")
        report["prepared_for_demo"] = False
    finally:
        if initialized:
            try:
                mt5.shutdown()
            except Exception:
                report["issues"].append("terminal_shutdown_failed_details_redacted")
                report["prepared_for_demo"] = False
    return report


def main() -> int:
    if sys.platform != "win32":
        report = base_report()
        report["issues"].append("windows_mt5_terminal_required_not_available_in_this_environment")
    else:
        try:
            mt5 = importlib.import_module("MetaTrader5")
        except Exception:
            report = base_report()
            report["issues"].append("official_metatrader5_package_unavailable")
        else:
            report = inspect_terminal(mt5)
    print(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False))
    return 0 if report["prepared_for_demo"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
