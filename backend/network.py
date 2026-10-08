from functools import lru_cache
from ipaddress import ip_address, ip_network

from fastapi import Request

from config import settings


@lru_cache(maxsize=1)
def _trusted_proxy_networks():
    return tuple(
        ip_network(cidr.strip(), strict=False)
        for cidr in settings.trusted_proxy_cidrs.split(",")
        if cidr.strip()
    )


def _is_trusted_proxy(host: str) -> bool:
    try:
        address = ip_address(host)
    except ValueError:
        return False
    return any(address in network for network in _trusted_proxy_networks())


def client_ip(request: Request) -> str:
    """Adres klienta. CF-Connecting-IP jest brany pod uwagę tylko od zaufanego proxy (nginx)."""
    peer = request.client.host if request.client else "unknown"
    forwarded = request.headers.get("CF-Connecting-IP", "").strip()
    if forwarded and _is_trusted_proxy(peer):
        try:
            return str(ip_address(forwarded))
        except ValueError:
            return peer
    return peer
