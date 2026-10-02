#!/usr/bin/env python3
"""Package an ESP-IDF nucula build for /setup. Never use a merged flash image."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import struct
import tarfile


def package(build, output):
    build = build.resolve()
    description = json.loads((build / "project_description.json").read_text())
    source = Path(description["project_path"])
    version = description["project_version"]
    if not re.fullmatch(r"[A-Za-z0-9._-]{1,64}", version):
        raise ValueError("Use a version containing only letters, digits, dots, hyphens and underscores")
    if description["target"] != "esp32c3" or description["project_name"] != "nucula":
        raise ValueError("Expected a nucula ESP32-C3 build")
    wifi = (source / "main/wifi.c").read_text()
    if "wifi_config.h" in wifi or "WIFI_SSID" in wifi or "WIFI_PASS" in wifi:
        raise ValueError("Refusing a build that may contain compiled-in Wi-Fi credentials")
    if "web_setup.cpp" not in (source / "main/CMakeLists.txt").read_text():
        raise ValueError("Firmware must include the USB setup protocol")
    args = json.loads((build / "flasher_args.json").read_text())
    expected = {0: ("bootloader.bin", 0x8000), 0x8000: ("partition-table.bin", 0x1000), 0x30000: ("nucula.bin", 0x1D0000)}
    flash_files = {int(address, 16): path for address, path in args["flash_files"].items()}
    if set(flash_files) != set(expected) or args["extra_esptool_args"]["chip"] != "esp32c3":
        raise ValueError("Unexpected flash layout; wallet/NVS images must never be packaged")
    if args["flash_settings"]["flash_size"] != "4MB":
        raise ValueError("Expected 4 MB flash")
    table = (build / flash_files[0x8000]).read_bytes()
    entries = []
    for start in range(0, len(table), 32):
        entry = table[start:start + 32]
        if len(entry) < 32 or entry[:2] != b"\xaa\x50":
            break
        magic, kind, sub, offset, size, label, flags = struct.unpack("<HBBII16sI", entry)
        entries.append((kind, sub, offset, size, label.rstrip(b"\0")))
    if entries != [(1, 2, 0x9000, 0x26000, b"nvs"), (1, 1, 0x2F000, 0x1000, b"phy_init"), (0, 0, 0x30000, 0x1D0000, b"factory")]:
        raise ValueError("Partition table does not match the nucula v2 wallet layout")
    images = []
    for offset, filename in flash_files.items():
        path = (build / filename).resolve()
        if not path.is_relative_to(build):
            raise ValueError("Image is outside the build directory")
        data = path.read_bytes()
        name, limit = expected[offset]
        if not data or len(data) > limit:
            raise ValueError("Image exceeds its allowed region")
        if offset != 0x8000 and (data[0] != 0xE9 or struct.unpack_from("<H", data, 12)[0] != 5):
            raise ValueError("Expected an ESP32-C3 executable image")
        if offset == 0x30000:
            # ESP-IDF app descriptor starts after the image + segment headers.
            if data[48:80].split(b"\0")[0].decode() != version:
                raise ValueError("Application version does not match the build metadata")
            if b"@NUCULA " not in data:
                raise ValueError("Application binary does not contain the USB setup protocol")
        images.append((name, data, {"path": f"/firmware/{version}/{name}", "offset": offset,
            "size": len(data), "sha256": hashlib.sha256(data).hexdigest(), "md5": hashlib.md5(data).hexdigest()}))
    destination = output / version
    # Version directories are immutable so a cached page cannot receive new bytes
    # under the same release URL. Use a new PROJECT_VER for another release.
    if destination.exists():
        raise ValueError(f"Version already exists: {version}. Choose a new version.")
    destination.mkdir(parents=True)
    for name, data, _ in images:
        (destination / name).write_bytes(data)
    # Publish corresponding source including submodule contents, with an explicit
    # allowlist. Personal headers, build caches and VCS metadata are excluded.
    with tarfile.open(destination / "source.tar.gz", "w:gz") as archive:
        for root in ["main", "components", "managed_components"]:
            for path in sorted((source / root).rglob("*")):
                if not path.is_file() or path.is_symlink():
                    continue
                if any(p in {".git", "build", "__pycache__", ".cache"} for p in path.parts) or path.name == "wifi_config.h":
                    continue
                archive.add(path, arcname=str(Path("nucula") / path.relative_to(source)))
        for name in ["CMakeLists.txt", "sdkconfig", "sdkconfig.defaults", "partitions.csv", "dependencies.lock", "README.md", "LICENSE", "LICENSE.md"]:
            path = source / name
            if path.exists():
                archive.add(path, arcname=f"nucula/{name}")
    manifest = {"schema": 1, "board": "nucula-v2", "chip": "ESP32-C3", "version": version,
        "notes": "USB setup preview for Rev-A. Wi-Fi configuration and serial console; OLED remains disabled for bring-up. Hardware validation pending.",
        "source": f"/firmware/{version}/source.tar.gz",
        "parts": [part for _, _, part in sorted(images, key=lambda item: item[2]["offset"])]}
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    shutil.copyfile(destination / "manifest.json", output / "manifest.json")
    print(f"Packaged {version}: {sum(len(data) for _, data, _ in images):,} bytes; no NVS image")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("build", type=Path)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "public/firmware")
    options = parser.parse_args()
    package(options.build, options.output)
