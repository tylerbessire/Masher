import os
import shutil
from pathlib import Path
from typing import Protocol

import boto3
from botocore.client import BaseClient


class ObjectStore(Protocol):
    def put(self, key: str, file_path: Path) -> str: ...
    def get(self, key: str, dest_path: Path) -> Path: ...
    def url(self, key: str, expires_sec: int = 3600) -> str: ...


class LocalObjectStore:
    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def put(self, key: str, file_path: Path) -> str:
        dest = self.root / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(file_path, dest)
        return str(dest)

    def get(self, key: str, dest_path: Path) -> Path:
        src = self.root / key
        shutil.copyfile(src, dest_path)
        return dest_path

    def url(self, key: str, expires_sec: int = 3600) -> str:
        return f"file://{self.root / key}"


class S3ObjectStore:
    def __init__(self, bucket: str, client: BaseClient | None = None):
        self.bucket = bucket
        self.client = client or boto3.client("s3", endpoint_url=os.getenv("S3_ENDPOINT"))

    def put(self, key: str, file_path: Path) -> str:
        self.client.upload_file(str(file_path), self.bucket, key)
        return f"s3://{self.bucket}/{key}"

    def get(self, key: str, dest_path: Path) -> Path:
        self.client.download_file(self.bucket, key, str(dest_path))
        return dest_path

    def url(self, key: str, expires_sec: int = 3600) -> str:
        return self.client.generate_presigned_url(
            "get_object", Params={"Bucket": self.bucket, "Key": key}, ExpiresIn=expires_sec
        )
