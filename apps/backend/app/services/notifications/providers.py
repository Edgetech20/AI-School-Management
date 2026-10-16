from abc import ABC, abstractmethod
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

import httpx


class SmsProvider(ABC):
    @abstractmethod
    def send(self, phone: str, message: str) -> None:
        raise NotImplementedError


class EmailProvider(ABC):
    @abstractmethod
    def send(self, email: str, subject: str, message: str) -> None:
        raise NotImplementedError


class ConsoleSmsProvider(SmsProvider):
    def send(self, phone: str, message: str) -> None:
        print(f"[SMS -> {phone}] {message}")


class ConsoleEmailProvider(EmailProvider):
    def send(self, email: str, subject: str, message: str) -> None:
        print(f"[EMAIL -> {email}] {subject} | {message}")


class WebhookSmsProvider(SmsProvider):
    def __init__(self, settings: dict[str, Any]) -> None:
        self.settings = settings

    def send(self, phone: str, message: str) -> None:
        settings = self.settings
        if not settings.get("sms_webhook_url"):
            return
        try:
            httpx.post(settings["sms_webhook_url"], json={"phone": phone, "message": message}, timeout=5.0)
        except Exception:
            # Preserve API flow even if external channel fails.
            pass


class SmtpEmailProvider(EmailProvider):
    def __init__(self, settings: dict[str, Any]) -> None:
        self.settings = settings

    def send(self, email: str, subject: str, message: str) -> None:
        settings = self.settings
        if not settings.get("smtp_host"):
            return

        plain_text = f"{subject}\n\n{message}\n\nThis is an automated attendance notification."
        html_body = self._build_html_email(subject=subject, message=message)

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        display_from = settings["smtp_from_email"]
        if settings.get("smtp_from_name"):
            display_from = f"{settings['smtp_from_name']} <{settings['smtp_from_email']}>"
        msg["From"] = display_from
        msg["To"] = email
        msg.attach(MIMEText(plain_text, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        try:
            encryption = str(settings.get("smtp_encryption") or "none").lower()
            if encryption == "ssl":
                server_cm = smtplib.SMTP_SSL(settings["smtp_host"], settings["smtp_port"], timeout=5)
            else:
                server_cm = smtplib.SMTP(settings["smtp_host"], settings["smtp_port"], timeout=5)

            with server_cm as server:
                if encryption == "tls":
                    server.starttls()
                if settings["smtp_username"]:
                    server.login(settings["smtp_username"], settings["smtp_password"])
                server.sendmail(settings["smtp_from_email"], [email], msg.as_string())
        except Exception:
            # Preserve API flow even when SMTP is unavailable locally.
            pass

    def _build_html_email(self, subject: str, message: str) -> str:
        safe_subject = subject.replace("<", "&lt;").replace(">", "&gt;")
        safe_message = message.replace("<", "&lt;").replace(">", "&gt;")
        lines = "".join(
            f"<p style=\"margin:0 0 8px;\">{line}</p>" for line in safe_message.split("\n") if line.strip()
        )
        return f"""
<!doctype html>
<html>
    <body style="margin:0;background:#f3f6fb;font-family:Segoe UI,Arial,sans-serif;color:#1f2937;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
            <tr>
                <td align="center">
                    <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dbe3ef;border-radius:14px;overflow:hidden;">
                        <tr>
                            <td style="background:linear-gradient(135deg,#0b3a78,#1f6ad6);padding:20px 24px;color:#ffffff;">
                                <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">Attendance Notification</div>
                                <div style="margin-top:6px;font-size:20px;font-weight:700;line-height:1.3;">{safe_subject}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:22px 24px 10px;">{lines}</td>
                        </tr>
                        <tr>
                            <td style="padding:0 24px 22px;color:#6b7280;font-size:12px;line-height:1.6;">
                                This is an automated message from Face Attendance System.
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>
""".strip()
