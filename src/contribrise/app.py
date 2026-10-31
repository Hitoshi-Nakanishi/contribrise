"""Contribrise: a local GitHub contribution viewer with no Python dependencies."""

import argparse
import json
import re
import subprocess
import threading
import time
import urllib.parse
import urllib.request
import webbrowser
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent / "static"
APP_ID = "contribrise"
USERNAME = re.compile(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\Z")
CACHE = {}
CACHE_LOCK = threading.Lock()


class AppError(Exception):
    def __init__(self, code, status=502):
        self.code = code
        self.status = status
        super().__init__(code)


def contributions(username, year):
    today = datetime.now(timezone(timedelta(hours=9))).date()
    if not USERNAME.fullmatch(username) or "--" in username:
        raise AppError("username", 400)
    if not 2008 <= year <= today.year:
        raise AppError("yearRange", 400)
    key = (username.lower(), year)
    with CACHE_LOCK:
        cached = CACHE.get(key)
    if cached and time.monotonic() - cached[0] < 300:
        return cached[1]
    until = min(today.isoformat(), f"{year}-12-31")
    query = (
        "query { user(login:" + json.dumps(username) + ") { login "
        "contributionsCollection(from:"
        + json.dumps(f"{year}-01-01T00:00:00Z")
        + ",to:"
        + json.dumps(until + "T23:59:59Z")
        + ") { "
        "contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }"
    )
    try:
        response = subprocess.run(
            ["gh", "api", "graphql", "-f", "query=" + query],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=20,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except FileNotFoundError as error:
        raise AppError("cliMissing") from error
    except subprocess.TimeoutExpired as error:
        raise AppError("timeout") from error
    try:
        payload = json.loads(response.stdout)
    except ValueError as error:
        raise AppError("login") from error
    if any(item.get("type") == "NOT_FOUND" for item in payload.get("errors", [])):
        raise AppError("notFound", 400)
    if response.returncode or payload.get("errors"):
        raise AppError("login")
    user = payload.get("data", {}).get("user")
    if not user:
        raise AppError("notFound", 400)
    calendar = user["contributionsCollection"]["contributionCalendar"]
    days = sorted(
        {
            day["date"]: day["contributionCount"]
            for week in calendar["weeks"]
            for day in week["contributionDays"]
            if f"{year}-01-01" <= day["date"] <= until
        }.items()
    )
    expected = (
        datetime.fromisoformat(until).date() - today.replace(year=year, month=1, day=1)
    ).days + 1
    if (
        len(days) != expected
        or sum(count for _, count in days) != calendar["totalContributions"]
    ):
        raise AppError("calendar")
    result = {
        "username": user["login"],
        "year": year,
        "until": until,
        "days": days,
        "total": sum(count for _, count in days),
        "fetchedAt": datetime.now(timezone(timedelta(hours=9))).isoformat(
            timespec="seconds"
        ),
    }
    with CACHE_LOCK:
        if len(CACHE) >= 64:
            CACHE.pop(next(iter(CACHE)))
        CACHE[key] = (time.monotonic(), result)
    return result


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def reply(self, status, content, content_type="application/json; charset=utf-8"):
        body = content.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'",
        )
        self.end_headers()
        try:
            self.wfile.write(body)
        except ConnectionError:
            pass

    def do_GET(self):
        host = f"127.0.0.1:{self.server.server_port}"
        if self.headers.get("Host") != host:
            self.reply(403, json.dumps({"error": "Invalid host"}))
            return
        if (
            self.headers.get("Sec-Fetch-Site") == "cross-site"
            or self.headers.get("Origin", f"http://{host}") != f"http://{host}"
        ):
            self.reply(403, json.dumps({"error": "Invalid origin"}))
            return
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path == "/":
            self.reply(
                200,
                (ROOT / "index.html").read_text(encoding="utf-8"),
                "text/html; charset=utf-8",
            )
        elif parsed.path in ("/app.js", "/theme.js", "/style.css"):
            content_type = (
                "text/javascript; charset=utf-8"
                if parsed.path.endswith(".js")
                else "text/css; charset=utf-8"
            )
            self.reply(
                200, (ROOT / parsed.path[1:]).read_text(encoding="utf-8"), content_type
            )
        elif parsed.path == "/health":
            self.reply(200, json.dumps({"app": APP_ID}))
        elif parsed.path == "/api/contributions":
            query = urllib.parse.parse_qs(parsed.query)
            try:
                username = query.get("user", [""])[0]
                year = int(query.get("year", ["0"])[0])
                self.reply(
                    200, json.dumps(contributions(username, year), ensure_ascii=False)
                )
            except ValueError:
                self.reply(400, json.dumps({"code": "yearRange"}))
            except AppError as error:
                self.reply(error.status, json.dumps({"code": error.code}))
        else:
            self.reply(404, json.dumps({"error": "Not found"}))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--open", action="store_true")
    parser.add_argument("--port", type=int, default=8783)
    args = parser.parse_args()
    if args.open and args.port:
        url = f"http://127.0.0.1:{args.port}"
        try:
            with urllib.request.urlopen(url + "/health", timeout=1) as response:
                if json.load(response).get("app") == APP_ID:
                    webbrowser.open(url)
                    return
        except (OSError, ValueError):
            pass
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    except OSError:
        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    server.daemon_threads = True
    url = f"http://127.0.0.1:{server.server_port}"
    if args.open:
        webbrowser.open(url)
    elif __import__("sys").stdout:
        print(url, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
