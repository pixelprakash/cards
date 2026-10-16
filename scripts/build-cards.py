"""Builds the game's card data from the designer's card faces.

  src-cards/<deck folder>/NN_Name.png|jpg   the final card faces (600 x 1050), plus one Cover_* file per deck (the back)
  public/cards/full/<deck>/<id>.webp        600 wide, for the zoomed view
  public/cards/full/<deck>/<id>-sm.webp     300 wide, for tiles
  src/cards/data.js                         names, descriptions, sentence phrases, file paths

Run:  python3 scripts/build-cards.py
Descriptions are what is printed on each card (read from the card faces). Places cards carry no description.
`say` is how the card reads inside the game's sentence; that wording is the game's, not printed on the cards."""
import json, os, re
from PIL import Image

SRC, OUT = "src-cards", "public/cards/full"
FOLDERS = {"issue": "Issue Card", "forces": "12 Forces of Change", "value": "Value Card", "methods": "Methods of lerning", "places": "Place & Space Cards"}

DECKS = {
 "issue": {"name": "Issue Cards", "noun": "Issue card", "blurb": "Issues facing education today, each described in a line.", "cards": [
  (1, "credential-inflation", "Credential Inflation", "credential inflation", "The value of degrees drops when more students earn them while standards fall or remain uneven."),
  (2, "limits-of-academic-freedom", "Limits of Academic Freedom", "the limits of academic freedom", "Rules or pressures that restrict what teachers and researchers may study, publish, or discuss."),
  (3, "rising-educational-costs", "Rising Educational Costs", "rising educational costs", "Steady growth in tuition, fees, and related expenses that makes higher education harder to afford."),
  (4, "quality-disparities", "Quality Disparities", "quality disparities", "Wide gaps in teaching standards, learning support, and outcomes across institutions or regions."),
  (5, "access-barriers", "Access Barriers", "access barriers", "Financial, social, cultural, or policy obstacles that prevent learners from entering or continuing education."),
  (6, "technology-over-reliance", "Technology Over-Reliance", "technology over-reliance", "Heavy dependence on digital tools that weakens learning quality or widens gaps for students with limited access."),
  (7, "curricular-problems", "Curricular Problems", "curricular problems", "Course content that is outdated, misaligned with learner needs, or poorly structured for real-world use."),
  (8, "university-corporatization", "University Corporatization", "university corporatization", "Adoption of market-driven policies that place revenue and branding above academic values."),
  (9, "skills-mismatch", "Skills Mismatch", "a skills mismatch", "A gap between what graduates can do and what employers or communities actually need."),
  (10, "research-ethics-failures", "Research Ethics Failures", "research ethics failures", "Problems linked to dishonesty, unsafe practices, or lack of transparency in research work."),
  (11, "infrastructure-deficits", "Infrastructure Deficits", "infrastructure deficits", "Shortages or poor quality of essential facilities, equipment, or support systems that weaken learning or research."),
 ], "blank": (12, "You Spot the Issue")},
 "forces": {"name": "12 Forces of Change", "noun": "Forces of Change card", "blurb": "Twelve forces reshaping the world, each ending with a “So what?” prompt.", "cards": [
  (1, "becoming", "Becoming", "becoming", "Technology is in a constant state of evolution and upgrade, never static but always in beta. Our tools, identities, and knowledge are continuously edited and improved. Mastery is temporary, and lifelong learning is essential."),
  (2, "cognifying", "Cognifying", "cognifying", "Artificial Intelligence is embedding intelligence into everything, making devices and systems smarter. AI acts as a cloud brain augmenting human cognition rather than replacing it. This democratizes access to intelligence across society."),
  (3, "flowing", "Flowing", "flowing", "Information no longer exists as static units but flows continuously through networks. The internet acts as a superorganism with real-time interconnectivity as its lifeblood. Services and processes that facilitate constant flow are favored over static products."),
  (4, "screening", "Screening", "screening", "All content migrates to screens, changing the medium and grammar of communication. Multimedia and multisensory interfaces create nonlinear, personalized narratives. Attention becomes fragmented across diverse formats."),
  (5, "accessing", "Accessing", "accessing", "Ownership shifts to access, with temporary use and shared services replacing possession. Platforms dominate over products, redefining consumption and capitalism."),
  (6, "sharing", "Sharing", "sharing", "Digital networks fuel sharing of data, opinions, and goods, fostering new social norms and collaborative economic models. Open source and community-driven innovation become central."),
  (7, "filtering", "Filtering", "filtering", "Personalized filters (algorithmic, social, and cognitive) become essential to manage information overload. Curation replaces creation as a key value function. This raises concerns about bias and echo chambers."),
  (8, "remixing", "Remixing", "remixing", "Content is malleable and can be copied, edited, and recombined endlessly. The line between producer and consumer blurs into ‘prosumers.’"),
  (9, "interacting", "Interacting", "interacting", "Human-computer interaction evolves beyond keyboards and screens to touch, gesture, voice, and immersive interfaces. Virtuality becomes a major platform."),
  (10, "tracking", "Tracking", "tracking", "Surveillance becomes default with sensors and platforms constantly recording data. While raising privacy concerns, mutual transparency can build trust in complex systems."),
  (11, "questioning", "Questioning", "questioning", "Rapid change generates more questions than answers. Asking the right questions becomes a core skill in a world of abundant information."),
  (12, "beginning", "Beginning", "beginning", "Global connectivity and a planetary internet herald a new era of systemic birth and coordination. A universal digital consciousness is emerging."),
 ]},
 "value": {"name": "Value Cards", "noun": "Value card", "blurb": "Each card names a value and defines it in a line or two.", "cards": [
  (1, "diversity", "Diversity", "diversity", "The presence of people with different backgrounds, ideas, view points and ways of life in the same place."),
  (2, "equity", "Equity", "equity", "Fair treatment that gives each person the support they need to reach the same goal. A system that removes barriers so everyone has a real chance to succeed."),
  (3, "innovation", "Innovation", "innovation", "A new or improved idea, tool, or method that solves a problem in a better way. A change that makes a product or process faster, safer, cheaper, or easier."),
  (4, "collaboration", "Collaboration", "collaboration", "People working together toward a shared goal by using each person’s strengths, where people share ideas to solve problems as one team."),
  (5, "critical-thinking", "Critical Thinking", "critical thinking", "The skill of examining information with care so you can judge what is true, useful, or reliable. Focusing on facts you avoid mistakes and false claims."),
  (6, "ethics", "Ethics", "ethics", "Rules of right and wrong that guide how people act and make decisions. It helps people choose actions that respect others and prevent harm."),
  (7, "sustainability", "Sustainability", "sustainability", "Using resources wisely to meet today’s needs while safeguarding them for future generations."),
  (8, "adaptability", "Adaptability", "adaptability", "The ability to adjust your actions or plans when things change. A skill that helps you stay effective when rules, tools, or situations shift."),
  (9, "lifelong-learning", "Lifelong Learning", "lifelong learning", "The habit of gaining new knowledge and skills throughout your life. A steady effort to update your knowledge as the world and technology change."),
  (10, "empowerment", "Empowerment", "empowerment", "Giving people the confidence and tools they need to make decisions and take action. Helps people make choices and control parts of their own lives."),
  (11, "creativity", "Creativity", "creativity", "Giving people the confidence and tools they need to make decisions and take action. Helps people make choices and control parts of their own lives."),
  (12, "resilience", "Resilience", "resilience", "The strength to recover from difficulties and keep moving forward. A steady mindset that helps you face stress, rebuild, and try again."),
 ], "blank": (13, "Name Your Value")},
 "methods": {"name": "Methods of Learning", "noun": "Method of Learning card", "blurb": "Each card names a method of learning and says in one line how students learn through it.", "cards": [
  (1, "flipped-learning", "Flipped Learning", "flipped learning", "Students learn content before class and use group time for practice."),
  (2, "project-based-learning", "Project-Based Learning", "project-based learning", "Students complete a structured project that leads to a final product."),
  (3, "experiential-learning", "Experiential Learning", "experiential learning", "Students learn through action, observation, and reflection."),
  (4, "problem-based-learning", "Problem-Based Learning", "problem-based learning", "Students solve open-ended problems using research and teamwork."),
  (5, "inquiry-based-learning", "Inquiry-Based Learning", "inquiry-based learning", "Students build understanding by asking questions and seeking evidence."),
  (6, "case-based-learning", "Case-Based Learning", "case-based learning", "Students analyse real events or scenarios and reason through decisions."),
  (7, "discussion-based-learning", "Discussion-Based Learning", "discussion-based learning", "Students build ideas through dialogues, debates, and guided conversation."),
  (8, "gamified-learning", "Gamified Learning", "gamified learning", "Students learn through points, levels, challenges, and rewards."),
  (9, "adaptive-learning", "Adaptive Learning", "adaptive learning", "Digital tools adjust difficulty and pace to match performance."),
  (10, "micro-learning", "Micro Learning", "micro learning", "Students learn through very short lessons that target one idea or skill."),
  (11, "role-play-based-learning", "Role Play-Based Learning", "role play-based learning", "Students act out roles to explore viewpoints and decisions."),
  (12, "peer-learning", "Peer Learning", "peer learning", "Students learn by teaching or explaining to one another."),
  (13, "story-based-learning", "Story-Based Learning", "story-based learning", "Concepts are taught through narratives, characters, or plotlines."),
  (14, "simulation-based-learning", "Simulation-Based Learning (Method)", "simulation-based learning", "Students use controlled scenarios or digital simulations to practice skills."),
  (15, "reflective-learning", "Reflective Learning", "reflective learning", "Students grow through journaling, logs, or guided reflection prompts."),
 ]},
 "places": {"name": "Places and Spaces", "noun": "Places and Spaces card", "blurb": "The physical and imagined spaces where learning might occur, from public venues to speculative environments.", "cards": [
  (1, "library-laboratory", "Library / Laboratory", "a library or laboratory", ""),
  (2, "outdoor-spaces", "Outdoor Spaces", "outdoor spaces", ""),
  (3, "forests-farmlands", "Forests & farmlands", "forests and farmlands", ""),
  (4, "makerspace", "Makerspace", "a makerspace", ""),
  (5, "studio-space", "Studio Space", "a studio space", ""),
  (6, "workplace-internship", "Workplace / Internship", "a workplace or internship", ""),
  (7, "community-center", "Community Center", "a community center", ""),
  (8, "simulation-center", "Simulation Center", "a simulation center", ""),
  (9, "museum-gallery", "Museum / Gallery", "a museum or gallery", ""),
  (10, "mindfulness-meditation-center", "Mindfulness / Meditation Center", "a mindfulness or meditation center", ""),
  (11, "ai-ar-vr-mr-learning-pod", "AI / AR / VR / MR Learning Pod", "an AI, AR, VR or MR learning pod", ""),
  (12, "bio-dome", "Bio-Dome", "a bio-dome", ""),
  (13, "street-food-bazaar", "Street Food Bazaar", "a street food bazaar", ""),
  (14, "public-transit", "Public Transit (bus/train/metro)", "public transit (bus, train or metro)", ""),
  (15, "riverboat", "Riverboat", "a riverboat", ""),
  (16, "themed-escape-rooms", "Themed Escape Rooms", "themed escape rooms", ""),
  (17, "learning-village", "Learning Village", "a learning village", ""),
  (18, "mobile-learning-van", "Mobile Learning Van", "a mobile learning van", ""),
  (19, "top-of-the-tree", "Top of the Tree", "the top of a tree", ""),
  (20, "convenience-store", "Convenience Store", "a convenience store", ""),
  (21, "parking-lot", "Parking Lot", "a parking lot", ""),
  (22, "home-kitchen-spaces", "Home and Kitchen Spaces", "home and kitchen spaces", ""),
  (23, "kiosk", "Kiosk", "a kiosk", ""),
 ], "blank": (24, "Name Your Space")},
}

def find(folder, order):
    prefix = f"{order:02d}_"
    for f in os.listdir(os.path.join(SRC, folder)):
        if f.startswith(prefix):
            return f
    raise SystemExit(f"missing {folder}/{prefix}*")

def save(im, deck, base):
    for w, suffix in ((300, "-sm"), (600, "")):
        h = round(im.height * w / im.width)
        im.resize((w, h), Image.LANCZOS).save(os.path.join(OUT, deck, f"{base}{suffix}.webp"), "WEBP", quality=82, method=6)

result = {}
for key, spec in DECKS.items():
    folder = FOLDERS[key]
    os.makedirs(os.path.join(OUT, key), exist_ok=True)
    cover = [f for f in os.listdir(os.path.join(SRC, folder)) if f.lower().startswith("cover")][0]
    save(Image.open(os.path.join(SRC, folder, cover)).convert("RGB"), key, "cover")
    cards = []
    for order, cid, name, say, desc in spec["cards"]:
        save(Image.open(os.path.join(SRC, folder, find(folder, order))).convert("RGB"), key, cid)
        cards.append({"id": cid, "name": name, "say": say, "desc": desc,
                      "img": f"/cards/full/{key}/{cid}.webp", "sm": f"/cards/full/{key}/{cid}-sm.webp"})
    blank = spec.get("blank")
    if blank:   # a blank card for the printed game: not used in the first build (user-made cards come later)
        save(Image.open(os.path.join(SRC, folder, find(folder, blank[0]))).convert("RGB"), key, "blank")
    result[key] = {"key": key, "name": spec["name"], "noun": spec["noun"], "blurb": spec["blurb"],
                   "cover": f"/cards/full/{key}/cover.webp", "coverSm": f"/cards/full/{key}/cover-sm.webp", "cards": cards}
    print(key, len(cards))
os.makedirs("src/cards", exist_ok=True)
open("src/cards/data.js", "w").write("// Generated by scripts/build-cards.py. Do not edit by hand.\nexport default " + json.dumps(result, indent=1, ensure_ascii=False) + ";\n")
