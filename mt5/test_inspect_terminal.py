import io
import json
import unittest
from contextlib import redirect_stdout
from types import SimpleNamespace as NS
from unittest.mock import patch

from inspect_terminal import EXPECTED_SYMBOLS, inspect_terminal, main

NOW = 1_800_000_000


class ReadOnlyTerminal:
    ACCOUNT_TRADE_MODE_DEMO = 0
    SYMBOL_TRADE_MODE_FULL = 4

    def __init__(self):
        self.calls = []
        self.account = NS(server="Deriv.com Limited", trade_mode=0,
                          login=123456789, name="PRIVATE_ACCOUNT_NAME")
        self.missing = None
        self.tick_time = NOW - 3
        self.connected = True
        self.initialized = True

    def initialize(self):
        self.calls.append(("initialize",))
        return self.initialized

    def shutdown(self):
        self.calls.append(("shutdown",))

    def terminal_info(self):
        self.calls.append(("terminal_info",))
        return NS(connected=self.connected, path="PRIVATE_PATH")

    def account_info(self):
        self.calls.append(("account_info",))
        return self.account

    def symbol_info(self, symbol):
        self.calls.append(("symbol_info", symbol))
        if symbol == self.missing:
            return None
        return NS(trade_contract_size=100.0, trade_tick_size=.01,
                  trade_tick_value=1.0, volume_min=.01, volume_max=100.,
                  volume_step=.01, point=.01, digits=2, trade_mode=4,
                  trade_stops_level=10, swap_long=-2.0, swap_short=1.0)

    def symbol_info_tick(self, symbol):
        self.calls.append(("symbol_info_tick", symbol))
        return NS(time_msc=self.tick_time * 1000, time=self.tick_time,
                  bid=2000.0, ask=2000.3, last=2000.1)

    def __getattr__(self, name):
        raise AssertionError("Unexpected SDK operation: " + name)


class InspectionTests(unittest.TestCase):
    def test_demo_exact_symbols_and_read_only_api(self):
        sdk = ReadOnlyTerminal()
        report = inspect_terminal(sdk, now=NOW)
        self.assertTrue(report["prepared_for_demo"])
        self.assertFalse(report["orders_enabled"])
        self.assertEqual(report["expected_symbols"], ["XAUSD", "NDAQ.QQ"])
        self.assertEqual([s["requested_symbol"] for s in report["symbols"]], list(EXPECTED_SYMBOLS))
        permitted = {"initialize", "shutdown", "terminal_info", "account_info", "symbol_info", "symbol_info_tick"}
        self.assertTrue(all(call[0] in permitted for call in sdk.calls))
        self.assertEqual(sdk.calls[-1], ("shutdown",))
        serialized = json.dumps(report)
        self.assertNotIn("123456789", serialized)
        self.assertNotIn("PRIVATE_ACCOUNT_NAME", serialized)
        self.assertNotIn("PRIVATE_PATH", serialized)
        self.assertIsNone(report["symbols"][0]["specification"]["commission"])

    def test_exact_missing_symbol_is_not_replaced(self):
        sdk = ReadOnlyTerminal()
        sdk.missing = "XAUSD"
        report = inspect_terminal(sdk, now=NOW)
        self.assertFalse(report["prepared_for_demo"])
        self.assertFalse(report["symbols"][0]["found"])
        self.assertIn("exact_symbol_not_found_no_substitution", report["symbols"][0]["issues"])
        self.assertEqual([c[1] for c in sdk.calls if c[0] == "symbol_info"], list(EXPECTED_SYMBOLS))

    def test_server_mismatch_blocks_readiness(self):
        sdk = ReadOnlyTerminal()
        sdk.account.server = "Different-Server"
        report = inspect_terminal(sdk, now=NOW)
        self.assertFalse(report["prepared_for_demo"])
        self.assertIn("server_mismatch_no_automatic_substitution", report["issues"])

    def test_real_or_unconfirmed_account_blocks_readiness(self):
        for mode in (1, 2, None):
            sdk = ReadOnlyTerminal()
            sdk.account.trade_mode = mode
            with self.subTest(mode=mode):
                report = inspect_terminal(sdk, now=NOW)
                self.assertFalse(report["prepared_for_demo"])
                self.assertFalse(report["orders_enabled"])
                self.assertIn("account_is_not_confirmed_demo", report["issues"])

    def test_stale_and_future_ticks_block_readiness(self):
        for offset in (-90, 15):
            sdk = ReadOnlyTerminal()
            sdk.tick_time = NOW + offset
            with self.subTest(offset=offset):
                report = inspect_terminal(sdk, now=NOW)
                self.assertFalse(report["prepared_for_demo"])
                self.assertTrue(report["symbols"][0]["tick"]["stale"])

    def test_missing_ticks_and_disconnected_terminal_block_readiness(self):
        sdk = ReadOnlyTerminal()
        sdk.symbol_info_tick = lambda symbol: None
        report = inspect_terminal(sdk, now=NOW)
        self.assertFalse(report["prepared_for_demo"])
        self.assertIsNone(report["symbols"][0]["tick"])
        sdk = ReadOnlyTerminal()
        sdk.connected = False
        report = inspect_terminal(sdk, now=NOW)
        self.assertFalse(report["prepared_for_demo"])
        self.assertIn("terminal_not_connected", report["issues"])

    def test_invalid_contract_does_not_pass(self):
        sdk = ReadOnlyTerminal()
        original = sdk.symbol_info
        def invalid(symbol):
            info = original(symbol)
            info.volume_step = 0
            return info
        sdk.symbol_info = invalid
        report = inspect_terminal(sdk, now=NOW)
        self.assertFalse(report["prepared_for_demo"])
        self.assertIn("incomplete_or_invalid_contract_specification", report["symbols"][0]["issues"])

    def test_unavailable_session_and_initialization(self):
        sdk = ReadOnlyTerminal()
        sdk.account = None
        self.assertFalse(inspect_terminal(sdk, now=NOW)["prepared_for_demo"])
        sdk = ReadOnlyTerminal()
        sdk.initialized = False
        report = inspect_terminal(sdk, now=NOW)
        self.assertEqual(sdk.calls, [("initialize",)])
        self.assertFalse(report["prepared_for_demo"])

    def test_sdk_exception_details_are_not_exposed(self):
        sdk = ReadOnlyTerminal()
        def fail():
            raise RuntimeError("PRIVATE_TOKEN_AND_CUSTOMER_DETAILS")
        sdk.account_info = fail
        report = inspect_terminal(sdk, now=NOW)
        self.assertNotIn("PRIVATE_TOKEN", json.dumps(report))
        self.assertFalse(report["prepared_for_demo"])
        self.assertEqual(sdk.calls[-1], ("shutdown",))

    def test_linux_cli_reports_windows_requirement_without_sdk(self):
        with patch("inspect_terminal.sys.platform", "linux"), redirect_stdout(io.StringIO()) as out:
            code = main()
        self.assertEqual(code, 2)
        report = json.loads(out.getvalue())
        self.assertFalse(report["prepared_for_demo"])
        self.assertIn("windows_mt5_terminal_required_not_available_in_this_environment", report["issues"])


if __name__ == "__main__":
    unittest.main()
