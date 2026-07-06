"""calendar.html: 3탭 네비 + 홈 수면 섹션 링크로 갱신"""
import re
from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'pages' / 'calendar.html'
text = p.read_text(encoding='utf-8')

text = text.replace(
    "onclick=\"location.href='sleep.html'\"",
    "onclick=\"location.href='../index.html#sleep-section'\"",
)
text = text.replace('href="sleep.html"', 'href="../index.html#sleep-section"')
text = text.replace("href='sleep.html'", "href='../index.html#sleep-section'")

new_nav = """    <nav class="bottom-nav">
      <div class="nav-item" data-href="../index.html">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">홈</span>
        <span class="nav-dot"></span>
      </div>
      <div class="nav-item" data-href="workshop.html">
        <span class="nav-icon">🧶</span>
        <span class="nav-label">공방</span>
        <span class="nav-dot"></span>
      </div>
      <div class="nav-item" data-href="friends.html">
        <span class="nav-icon">👥</span>
        <span class="nav-label">친구</span>
        <span class="nav-dot"></span>
      </div>
    </nav>"""

text, n = re.subn(
    r'    <nav class="bottom-nav">.*?</nav>',
    new_nav,
    text,
    count=1,
    flags=re.DOTALL,
)
if n != 1:
    raise SystemExit(f'nav replace failed: {n}')

p.write_text(text, encoding='utf-8')
print('patched', p)
