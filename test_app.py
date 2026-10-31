import json
import subprocess
import sys
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from contribrise import app  # noqa: E402 - tests also run without installing the package


def response(total=3):
    day = date(2025, 1, 1)
    days = []
    while day.year == 2025:
        days.append(
            {
                "date": day.isoformat(),
                "contributionCount": total if day.day == 1 and day.month == 1 else 0,
            }
        )
        day += timedelta(days=1)
    return subprocess.CompletedProcess(
        [],
        0,
        json.dumps(
            {
                "data": {
                    "user": {
                        "login": "octocat",
                        "contributionsCollection": {
                            "contributionCalendar": {
                                "totalContributions": total,
                                "weeks": [{"contributionDays": days}],
                            }
                        },
                    }
                }
            }
        ),
    )


class ContributionTests(unittest.TestCase):
    def setUp(self):
        app.CACHE.clear()

    @patch("contribrise.app.subprocess.run")
    def test_calendar_and_case_insensitive_cache(self, run):
        run.return_value = response()
        result = app.contributions("octocat", 2025)
        self.assertEqual(result["total"], 3)
        self.assertEqual(len(result["days"]), 365)
        self.assertEqual(result["until"], "2025-12-31")
        self.assertEqual(app.contributions("OCTOCAT", 2025), result)
        run.assert_called_once()

    @patch("contribrise.app.subprocess.run")
    def test_invalid_username_never_runs_cli(self, run):
        with self.assertRaises(app.AppError) as caught:
            app.contributions("--invalid", 2025)
        self.assertEqual(caught.exception.code, "username")
        run.assert_not_called()

    @patch("contribrise.app.subprocess.run")
    def test_missing_user_has_translatable_error(self, run):
        run.return_value = subprocess.CompletedProcess(
            [], 1, json.dumps({"errors": [{"type": "NOT_FOUND"}]})
        )
        with self.assertRaises(app.AppError) as caught:
            app.contributions("octocat", 2025)
        self.assertEqual(caught.exception.code, "notFound")

    @patch("contribrise.app.subprocess.run")
    def test_incomplete_calendar_is_not_cached(self, run):
        payload = json.loads(response().stdout)
        payload["data"]["user"]["contributionsCollection"]["contributionCalendar"][
            "weeks"
        ] = []
        run.return_value = subprocess.CompletedProcess([], 0, json.dumps(payload))
        with self.assertRaises(app.AppError) as caught:
            app.contributions("octocat", 2025)
        self.assertEqual(caught.exception.code, "calendar")
        self.assertFalse(app.CACHE)


if __name__ == "__main__":
    unittest.main()
