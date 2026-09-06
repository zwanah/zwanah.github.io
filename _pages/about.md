---
layout: academic
permalink: /
title: "Zhuoyue Wan"
excerpt: "Ph.D. candidate at The Hong Kong Polytechnic University. Research in natural language processing for databases, data curation, and data agents."
redirect_from:
  - /about/
  - /about.html
---

<section class="academic-section about-section" id="about-me" aria-labelledby="about-heading">
  <div class="section-label section-header"><h2 id="about-heading"><span aria-hidden="true">👋</span> About Me</h2></div>
  <div class="section-body biography" markdown="1">
I am a second-year Ph.D. candidate in Computer Science at [The Hong Kong Polytechnic University](https://www.polyu.edu.hk/) under the supervision of Professor [Chen Jason Zhang](https://zhangchen.info/). I also work closely with Professor [Raymond Chi-Wing Wong](https://www.cse.ust.hk/~raywong/). I previously earned my Master's degree from [The Hong Kong University of Science and Technology](https://hkust.edu.hk/) and my Bachelor of Science from [Chongqing University](https://www.cqu.edu.cn/).

My research centers on Natural Language Processing (NLP) for Database, with a particular focus on data-centric tasks. I am also interested in MLLM pre-training data construction, including efficient and automated data quality assessment models, data acquisition and curation, diversity assurance, noisy data cleaning, and coreset selection. In addition, I explore mathematical optimization techniques to enhance the performance and efficiency of Data Agents.

<div class="collaboration-callout"><p>💡 <strong>I am seeking exchange or visiting research opportunities in 2027, as well as long-term research collaborators with shared interests.</strong> If you are interested in my work, please feel free to contact me via email: <a href="mailto:{{ site.author.email }}">{{ site.author.email }}</a>.</p></div>

</div>
</section>

<section class="academic-section" id="research" aria-labelledby="thrust-heading">
  <div class="section-label section-header"><h2 id="thrust-heading"><span aria-hidden="true">🚀</span> Research Thrust</h2></div>
  <div class="research-thrusts">
    <article><h3>Natural Language Interfaces to Data</h3><p>Connecting natural language with databases, focusing on data-centric tasks including Text-to-SQL, Text-to-Visualization, and Text-to-OverpassQL.</p></article>
    <article><h3>MLLM Pre-training Data Construction</h3><p>Efficient data acquisition and curation, with a focus on diversity, noisy data cleaning, and coreset selection.</p></article>
    <article><h3>Data Agents & Optimization</h3><p>Exploring autonomous data agents and mathematical optimization to improve their performance and efficiency.</p></article>
  </div>
</section>

<section class="academic-section" id="news" aria-labelledby="news-heading">
  <span id="-news" class="legacy-anchor"></span>
  <div class="section-label section-header"><h2 id="news-heading"><span aria-hidden="true">🔥</span> News</h2></div>
  <div class="section-body">
    <ul class="news-list">
      {% for item in site.data.news limit:4 %}
      <li class="news-item"><time class="news-date" datetime="{{ item.date | replace: '.', '-' }}">{{ item.date }}</time><div class="news-content">{{ item.text | markdownify }}</div></li>
      {% endfor %}
    </ul>
    <details class="news-archive">
      <summary>Earlier updates <span aria-hidden="true">+</span></summary>
      <ul class="news-list">
        {% for item in site.data.news offset:4 %}
        <li class="news-item"><time class="news-date" datetime="{{ item.date | replace: '.', '-' }}">{{ item.date }}</time><div class="news-content">{{ item.text | markdownify }}</div></li>
        {% endfor %}
      </ul>
    </details>

</div>
</section>

<section class="academic-section publications-section" id="publications" aria-labelledby="publications-heading">
  <span id="-publications" class="legacy-anchor"></span>
  <div class="section-label section-header"><h2 id="publications-heading"><span aria-hidden="true">📄</span> Publications</h2><a class="section-link" href="{{ site.author.googlescholar }}">Google Scholar ↗</a></div>
  <div class="section-body">
    <p class="group-label">PUBLISHED & ACCEPTED</p>
    {% for paper in site.data.publications %}{% if paper.category == 'published' %}{% include academic-paper.html %}{% endif %}{% endfor %}
    <h3 class="group-label preprint-heading">PREPRINTS</h3>
    {% for paper in site.data.publications %}{% if paper.category == 'preprint' %}{% include academic-paper.html %}{% endif %}{% endfor %}

</div>
</section>

<section class="academic-section" id="education" aria-labelledby="education-heading">
  <span id="-educations" class="legacy-anchor"></span>
  <div class="section-label section-header"><h2 id="education-heading"><span aria-hidden="true">🎓</span> Education</h2></div>
  <div class="timeline education-list">
    <article class="timeline-item education-item"><div class="school-logo-container"><span class="school-symbol polyu-symbol"><img src="{{ '/assets/images/schools/polyu.png' | relative_url }}" alt="The Hong Kong Polytechnic University logo" loading="lazy"></span></div><div class="timeline-content"><h3>Ph.D. in Computer Science</h3><p><a href="https://www.polyu.edu.hk/">The Hong Kong Polytechnic University</a></p><p class="education-date">Jan. 2025 – present</p></div></article>
    <article class="timeline-item education-item"><div class="school-logo-container"><span class="school-symbol hkust-symbol"><img src="{{ '/assets/images/schools/hkust.svg' | relative_url }}" alt="The Hong Kong University of Science and Technology logo" loading="lazy"></span></div><div class="timeline-content"><h3>M.S. in Data-Driven Modeling</h3><p><a href="https://hkust.edu.hk/">The Hong Kong University of Science and Technology</a></p><p class="education-date">Sep. 2022 – Nov. 2023</p></div></article>
    <article class="timeline-item education-item"><div class="school-logo-container"><span class="school-symbol cqu-symbol"><img src="{{ '/assets/images/schools/cqu.png' | relative_url }}" alt="Chongqing University logo" loading="lazy"></span></div><div class="timeline-content"><h3>B.S. in Statistics</h3><p><a href="https://www.cqu.edu.cn/">Chongqing University</a></p><p class="education-date">Sep. 2017 – Jun. 2021</p></div></article>
  </div>
</section>

<section class="academic-section" id="honors" aria-labelledby="honors-heading">
  <span id="-honors-and-awards" class="legacy-anchor"></span>
  <div class="section-label section-header"><h2 id="honors-heading"><span aria-hidden="true">🏆</span> Honors & Awards</h2></div>
  <div class="honors-list">
    <div class="honor-item"><time class="honor-year" datetime="2018-11"><strong>Nov. 2018</strong></time><div class="honor-content"><p><strong>Second Prize, The Chinese Mathematics Competitions</strong></p></div></div>
    <div class="honor-item"><time class="honor-year" datetime="2021-05">May 2021</time><div class="honor-content"><p>Second-class Scholarship, Chongqing University</p></div></div>
    <div class="honor-item"><time class="honor-year" datetime="2020-12">Dec. 2020</time><div class="honor-content"><p>Advanced Individual of Scientific and Technological academic innovation, Chongqing University</p></div></div>
    <div class="honor-item"><time class="honor-year" datetime="2020-06">Jun. 2020</time><div class="honor-content"><p>Third Prize, The 8th TipDM Cup Data Mining Challenge Committee</p></div></div>
    <div class="honor-item"><time class="honor-year" datetime="2020-01">Jan. 2020</time><div class="honor-content"><p>Outstanding Student, Chongqing University</p></div></div>
    <div class="honor-item"><time class="honor-year" datetime="2019-01">Jan. 2019</time><div class="honor-content"><p>Outstanding Student, Chongqing University</p></div></div>
    <div class="honor-item"><time class="honor-year" datetime="2018-11">Nov. 2018</time><div class="honor-content"><p>Third-class Scholarship, Chongqing University</p></div></div>
  </div>
</section>

<section class="academic-section contact-section" id="contact" aria-labelledby="contact-heading">
  <div class="section-label section-header"><h2 id="contact-heading"><span aria-hidden="true">📍</span> Contact</h2></div>
  <div class="contact-card">
    <div class="contact-address"><p class="group-label">UNIVERSITY ADDRESS</p><h3>The Hong Kong Polytechnic University</h3><p>Hung Hom, Kowloon, Hong Kong <span lang="zh-Hant">· 香港九龍紅磡</span></p><a href="mailto:{{ site.author.email }}">{{ site.author.email }}</a></div>
    <div class="contact-panels">
      <section class="contact-panel" aria-labelledby="location-heading">
        <div class="panel-heading"><h3 id="location-heading">Address</h3></div>
        <div class="contact-visual">
        <iframe title="The Hong Kong Polytechnic University, Hung Hom campus map" src="https://www.google.com/maps?q=The+Hong+Kong+Polytechnic+University,+11+Yuk+Choi+Road&ll=22.3043,114.1796&z=17&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>
        <div class="panel-footer"><a href="https://www.polyu.edu.hk/campus-map/">Open campus map ↗</a></div>
      </section>
      <section class="contact-panel" aria-labelledby="visitors-heading">
        <div class="panel-heading"><h3 id="visitors-heading">Visitor Statistics</h3></div>
        <div class="visitor-widget contact-visual"><script async type="text/javascript" id="mapmyvisitors" src="{{ '/assets/vendor/mapmyvisitors/map.js' | relative_url }}?d=BaqRYnYzdyYOpYiBOwrZApLSRdeRj8OmuhxCm4DJgSo&amp;cl=ffffff&amp;w=300"></script><noscript><p>Enable JavaScript to view visitor statistics.</p></noscript></div>
        <div class="panel-footer"><p class="visitor-status" role="status">Visitor data is temporarily unavailable.</p>
        <p class="visitor-credit">Visitor map by <a href="https://mapmyvisitors.com/web/1c821">MapMyVisitors</a></p></div>
      </section>
    </div>
  </div>
</section>
