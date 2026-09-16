import io
import zipfile
from typing import List
from datetime import datetime

XMP_TEMPLATE = '''<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:xmp="http://ns.adobe.com/xap/1.0/"
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:lr="http://ns.adobe.com/lightroom/1.0/">
      <xmp:Rating>5</xmp:Rating>
      <xmp:Label>Green</xmp:Label>
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">Selected by client</rdf:li>
        </rdf:Alt>
      </dc:description>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>'''

def generate_xmp_content(filename_without_ext: str) -> bytes:
    """
    Generate XMP sidecar file content for a selected photo.
    Sets Rating=5 (5 stars) and Label=Green to mark as client-selected.
    """
    return XMP_TEMPLATE.encode("utf-8")

def generate_zip(client_name: str, filenames: List[str]) -> bytes:
    """
    Generate a ZIP archive containing one .xmp file per selected photo.

    Args:
        client_name: Used for ZIP filename
        filenames: List of filenames WITHOUT extension (e.g. ["DSC_0012", "DSC_0045"])

    Returns:
        ZIP file content as bytes
    """
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for name in filenames:
            # Strip extension if accidentally included
            name_clean = name.rsplit(".", 1)[0] if "." in name else name
            xmp_content = generate_xmp_content(name_clean)
            zf.writestr(f"{name_clean}.xmp", xmp_content)
    buffer.seek(0)
    return buffer.read()

def generate_filenames_string(filenames: List[str], separator: str = ", ") -> str:
    """
    Generate a comma-separated string of filenames (without extension).
    Useful for copy-paste into editing software.
    """
    cleaned = []
    for name in filenames:
        clean = name.rsplit(".", 1)[0] if "." in name else name
        cleaned.append(clean)
    return separator.join(cleaned)

def generate_csv(client_name: str, filenames: List[str]) -> bytes:
    """
    Generate a CSV file with selected photo filenames.
    """
    lines = ["filename,selected_by"]
    for name in filenames:
        clean = name.rsplit(".", 1)[0] if "." in name else name
        lines.append(f"{clean},{client_name}")
    return "\n".join(lines).encode("utf-8")
