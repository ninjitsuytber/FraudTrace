from markdown_pdf import MarkdownPdf, Section
import tempfile
import os

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
    cleaned_content = clean_text_for_pdf(text_content)
    pdf = MarkdownPdf(toc_level=2)
    pdf.add_section(Section(cleaned_content))
    
    fd, temp_path = tempfile.mkstemp(suffix=".pdf")
    
    try:
        os.close(fd)
        pdf.save(temp_path)
        with open(temp_path, "rb") as f:
            pdf_bytes = f.read()
        return pdf_bytes
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
'''
from fpdf import FPDF
'''

'''
#Testing code for PDF export, not used in final version
response = "In the span of a mere two decades, the fabric of human communication has undergone a more radical transformation than in the preceding two centuries. The advent of the internet, followed by the meteoric rise of social media platforms, promised a global village a utopian digital landscape where geographical boundaries would vanish and human connection would be instantaneous and universal. Today, billions of individuals carry the sum of human knowledge and the ability to contact anyone on Earth in their pockets. However, as these digital platforms have matured, a startling paradox has emerged: as our digital connectivity reaches its zenith, our sense of genuine social cohesion and psychological well-being appears to be in decline. This essay examines the multifaceted impact of social media on the human psyche and the structure of modern communities, arguing that while technology facilitates information exchange, it often does so at the expense of deep, authentic human connection. At the heart of the social media experience is the construction of the curated self. Unlike face to face interactions, which are spontaneous and involve non verbal cues that are difficult to manipulate, digital interactions allow for total control over one’s image. Users choose the highlights of their lives vacations, promotions, and social successes while omitting the mundane or painful realities of the human condition. This leads to a psychological phenomenon known as social comparison. When individuals view the polished, idealized lives of others, they often measure their own behind the scenes reality against someone else’s highlight reel. Research has consistently linked high levels of social media usage to increased rates of anxiety, depression, and body dysmorphia. The brain’s reward system, specifically the release of dopamine in response to likes and shares, creates a feedback loop that reinforces the need for external validation. When this validation is withheld or fluctuates, the impact on self esteem can be devastating, particularly for adolescents whose identities are still in a state of flux. Beyond the emotional impact, social media has fundamentally altered the way we process information and engage with one another. The architecture of these platforms is designed for infinite scroll and rapid fire consumption. This has led to what some psychologists call the fragmentation of attention. Deep, sustained focus the kind required for meaningful conversation or complex problem solving is increasingly being replaced by a state of constant, shallow distraction. In a physical social setting, the presence of a smartphone acts as a third party in the conversation. Studies have shown that the mere presence of a phone on a table, even if it is turned off, reduces the quality of the interaction and the sense of empathy between speakers. By prioritizing the digital ping over the physical presence of another human being, we are inadvertently training ourselves to be less present in our own lives. The word community implies a group of people with shared interests, but also shared responsibilities and mutual support. Social media has created networks, but networks are not necessarily communities. In a traditional community, individuals are often forced to interact with people who have different viewpoints, fostering a degree of tolerance and social friction that is necessary for a healthy society. Digital platforms, however, utilize algorithms designed to maximize engagement by showing users content that aligns with their existing beliefs. This creates echo chambers or filter bubbles. Rather than a global village, we have created a series of digital silos where confirmation bias is reinforced and dissent is viewed as an attack. The result is an increasingly polarized society where the other is dehumanized, and the middle ground of civil discourse disappears. The ease of unfriending or blocking someone removes the social necessity of conflict resolution, further weakening the social muscles required for real world coexistence. A significant, yet often overlooked, aspect of the digital connection paradox is the cost of entry. To participate in the modern digital community, individuals must surrender vast amounts of personal data. Human behavior, once a private matter, has been commodified. This Surveillance Capitalism uses our connections to predict and influence our future behavior, often for commercial or political ends. When our social interactions are mediated by corporations whose primary goal is profit through engagement, the nature of the interaction changes. We are no longer just friends talking; we are data points being harvested. This underlying layer of manipulation adds a subtle but pervasive sense of unease to digital life, contributing to a general erosion of trust in institutions and in each other. Despite these challenges, it would be a mistake to view social media as an unmitigated evil. It has played a crucial role in social movements, allowed marginalized groups to find support, and kept families connected across vast distances during global crises. The solution is not the abandonment of technology, but the cultivation of digital intentionality. Digital minimalism a philosophy where one focuses their online time on a small number of optimized and highly valued activities offers a potential remedy. By setting strict boundaries on usage and prioritizing high quality leisure face to face interactions, physical hobbies, deep reading over low quality digital consumption, individuals can reclaim their attention and their mental health. On a societal level, there is an urgent need for digital literacy education and potentially, regulatory oversight of algorithmic transparency. We must design platforms that prioritize human well being over raw engagement metrics. The digital revolution has granted us the miracle of instant communication, but we have discovered that communication is not the same as connection. The paradox of the modern age is that we are more plugged in than ever before, yet we are increasingly starved for the nourishment of authentic, unmediated human presence. To bridge this gap, we must recognize that the digital self is a shadow, not a soul. Real community requires the vulnerability of being seen flaws and all and the patience to engage with those who disagree with us. As we move further into the 21st century, our challenge will be to master our tools rather than being mastered by them, ensuring that our technology serves to enhance our humanity rather than diminish it. By reclaiming our attention and reinvesting in our physical communities, we can move past the illusion of connection and find our way back to each other. We must curate our digital spaces with the same care we curate our physical homes, ensuring that every interaction adds value rather than noise. The future of human connection depends on our ability to look up from our screens and into the eyes of those around us, rebuilding the social fabric one genuine conversation at a time. Only by de prioritizing the virtual can we truly revitalize the actual, transforming our hyper connected world into a truly connected one. This endeavor requires a conscious effort to resist the pull of the algorithm and to value the messy, unpredictable nature of real life interactions. We must seek out moments of silence and reflection, allowing our minds the space to grow outside the confines of a glowing display. In doing so, we ensure that the global village is not just a collection of isolated screens, but a vibrant ecosystem of human empathy and understanding. The path forward is not found in a new update or a faster connection, but in the timeless value of human presence. Ultimately, the quality of our lives is determined by the quality of our relationships, and those relationships require time, attention, and the willingness to be truly present. Let us choose to connect with purpose, to speak with kindness, and to listen with the intention of understanding. By doing so, we can turn the tide of digital isolation and rediscover the profound joy of being truly together. This journey back to authenticity is perhaps the most important work of our generation, as we learn to navigate the digital frontier without losing the essence of what makes us human."
response = response.replace('\u2019', "'").replace('\u2018', "'")
response = response.replace('\u201c', '"').replace('\u201d', '"')
response = response.encode('latin-1', 'ignore').decode('latin-1')
'''
'''
class PDF(FPDF):
    def header(self):
        self.set_font("Arial", "B", 14)
        self.cell(0, 10, "Analysis Report", 0, 1, "C")

    def footer(self):
        self.set_y(-15)
        self.set_font("Arial", "I", 8)
        self.cell(0, 10, f"Page {self.page_no()}", 0, 0, "C")

def export_to_pdf(text_content, filename):
    pdf = PDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Arial", "", 12)
    pdf.multi_cell(0, 5, txt=text_content)
    pdf.output(filename)
    return filename

def generate_pdf_bytes(text_content):
    pdf = PDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Arial", "", 12)
    pdf.multi_cell(0, 5, txt=text_content)
    return bytes(pdf.output())
'''
