from io import BytesIO
from zipfile import ZipFile

QUESTION_FILE = "X10\nPytanie?\nTak\nNie\n".encode()


def _zip(entries: dict[str, bytes]) -> bytes:
    buffer = BytesIO()
    with ZipFile(buffer, "w") as archive:
        for name, content in entries.items():
            archive.writestr(name, content)
    return buffer.getvalue()


def _upload(client, files, name="Moja talia"):
    return client.post("/decks/upload-form", data={"deck_name": name}, files=files)


def test_upload_txt_creates_deck(client):
    response = _upload(client, [("files", ("a.txt", QUESTION_FILE, "text/plain"))])

    assert response.status_code == 200
    assert response.json()["questions_added"] == 1


def test_upload_cp1250_file(client):
    content = "X1\nZażółć gęślą jaźń?\nTak\n".encode("cp1250")
    response = _upload(client, [("files", ("pl.txt", content, "text/plain"))])

    assert response.status_code == 200
    deck = client.get(f"/decks/{response.json()['deck_id']}").json()
    assert deck["questions"][0]["content"] == "Zażółć gęślą jaźń?"


def test_zip_with_path_traversal_is_rejected(client):
    archive = _zip({"../evil.txt": QUESTION_FILE})
    response = _upload(client, [("files", ("a.zip", archive, "application/zip"))])

    assert response.status_code == 400


def test_zip_entry_over_limit_is_rejected(client):
    archive = _zip({"big.txt": b"X1\nQ\nA\n" + b"a" * (1024 * 1024 + 1)})
    response = _upload(client, [("files", ("a.zip", archive, "application/zip"))])

    assert response.status_code == 413


def test_other_extensions_are_rejected(client):
    response = _upload(client, [("files", ("a.exe", b"MZ", "application/octet-stream"))])

    assert response.status_code == 400
