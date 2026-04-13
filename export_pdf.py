import re
import os
import tempfile
from markdown_pdf import MarkdownPdf, Section

def sanitize_markdown_tables(text):
    if not text:
        return ""
    
    text = re.sub(r'```(?:markdown|table|)\s*\n([\s\S]*?)\n\s*```', r'\1', text)
    
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        if "|" in line:
            line = re.sub(r'^\s*[•*+-]\s*\|', '|', line)
            line = re.sub(r'\|[•*+-]\s*', '| ', line)
        cleaned_lines.append(line)
    
    text = '\n'.join(cleaned_lines)
    
    output = []
    lines = text.split('\n')
    in_table = False
    
    for i, line in enumerate(lines):
        is_table_line = "|" in line
        if is_table_line and not in_table:
            if output and output[-1].strip() != "":
                output.append("")
            in_table = True
        elif not is_table_line and in_table:
            if line.strip() != "":
                output.append("")
            in_table = False
        output.append(line)
        
    return '\n'.join(output)

def clean_text_for_pdf(text):
    if not text:
        return ""
    replacements = {
        '\u2018': "'", '\u2019': "'",
        '\u201c': '"', '\u201d': '"',
        '\u2013': "-", '\u2014': "-",
        '\u2026': "...",
        '\u00a0': " ",
    }
    for unicode_char, ascii_char in replacements.items():
        text = text.replace(unicode_char, ascii_char)
    return text

def generate_pdf_bytes(text_content):
    css_path = os.path.join(os.path.dirname(__file__), "styles.css")
    with open(css_path, "r") as f:
        css_content = f.read()
    
    css = f"<style>{css_content}</style>"
    
    raw_text = clean_text_for_pdf(text_content)
    sanitized_text = sanitize_markdown_tables(raw_text)
    
    pdf = MarkdownPdf(toc_level=0)
    
    pattern = r'(?m)^(## \*\*(?:II|III|IV|V)\..*?)$'
    parts = re.split(pattern, sanitized_text)
    
    combined_parts = []
    if parts:
        combined_parts.append(parts[0])
        for i in range(1, len(parts), 2):
            combined_parts.append(parts[i] + parts[i+1])
            
    for part in combined_parts:
        content = part.strip()
        if content:
            pdf.add_section(Section(css + "\n\n" + content))
    
    fd, temp_path = tempfile.mkstemp(suffix=".pdf")
    try:
        os.close(fd)
        pdf.save(temp_path)
        with open(temp_path, "rb") as f:
            pdf_bytes = f.read()
        return pdf_bytes
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
