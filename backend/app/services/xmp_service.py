"""
XMP sidecar generation for Capture One / Lightroom.

Each selected photo gets a `<name>.xmp` file with Rating = 5 and Label = Green.
Placed next to the RAW file and synchronized, the editing software picks these up
so the client's picks are marked without any manual typing.
"""
import io
import zipfile
from datetime import datetime, timezone
from xml.sax.saxutils import escape

XMP_TEMPLATE = """<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Photo Selection Platform">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:xmp="http://ns.adobe.com/xap/1.0/"
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/"
        xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
      xmp:Rating="5"
      xmp:Label="Green"
      xmp:MetadataDate="{date}">
      <dc:subject>
        <rdf:Bag>
          <rdf:li>client-selected</rdf:li>
          <rdf:li>{client}</rdf:li>
        </rdf:Bag>
      </dc:subject>
      <xmpMM:DerivedFrom rdf:parseType="Resource">
        <stRef:filePath xmlns:stRef="http://ns.adobe.com/xap/1.0/sType/ResourceRef#">{filename}</stRef:filePath>
      </xmpMM:DerivedFrom>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>
"""


def base_name(filename: str) -> str:
    return filename.rsplit(".", 1)[0] if "." in filename else filename


def xmp_for(filename: str, client_name: str) -> str:
    return XMP_TEMPLATE.format(
        date=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        client=escape(client_name),
        filename=escape(filename),
    )


def build_zip(client_name: str, filenames: list[str]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for fn in filenames:
            zf.writestr(f"{base_name(fn)}.xmp", xmp_for(fn, client_name))
        zf.writestr("selected_files.txt", "\n".join(filenames) + "\n")
    return buf.getvalue()


def filenames_string(filenames: list[str]) -> str:
    return ", ".join(base_name(f) for f in filenames)


def build_csv(client_name: str, filenames: list[str]) -> str:
    lines = ["no,filename,base_name,client"]
    for i, fn in enumerate(filenames, 1):
        lines.append(f'{i},"{fn}","{base_name(fn)}","{client_name}"')
    return "\n".join(lines) + "\n"
