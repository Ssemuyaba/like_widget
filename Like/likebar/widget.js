(function () {
  const script = document.currentScript;
  const API = script.getAttribute("data-api");
  const TENANT_ID = script.getAttribute("data-tenant-id") || null;

  if (!API) {
    console.error("LikeBar: Missing API URL");
    return;
  }

  // select all lite-likebar divs
  const containers = document.querySelectorAll(".lite-likebar, [id='lite-likebar']");
  containers.forEach(container => {
    const pageKey = container.getAttribute("data-page-key");
    if (!pageKey) {
      console.error("LikeBar: Missing data-page-key for container", container);
      return;
    }

    container.innerHTML = `
      <div class="lb-wrapper">
        <div class="lb-top">
          <div class="lb-like-group">
            <button class="lb-like" aria-label="Like">❤️</button>
            <span class="lb-count">0</span>
          </div>
          <div class="lb-comment-group">
            <span class="lb-comment-count">💬 0</span>
            <button class="lb-toggle" title="Toggle comments">&#9660;</button>
          </div>
          <input class="lb-name" placeholder="Your name (optional)" />
          <textarea class="lb-text" placeholder="Write a comment..."></textarea>
          <button class="lb-send">Comment</button>
        </div>
        <div class="lb-list"></div>
      </div>
    `;

    const likeBtn = container.querySelector(".lb-like");
    const countEl = container.querySelector(".lb-count");
    const commentCountEl = container.querySelector(".lb-comment-count");
    const list = container.querySelector(".lb-list");
    const toggleBtn = container.querySelector(".lb-toggle");
    const likedKey = "lb-liked-" + pageKey;

    if (localStorage.getItem(likedKey)) likeBtn.disabled = true;

    function headers() {
      const h = { "Content-Type": "application/json" };
      if (TENANT_ID) h["X-Tenant-ID"] = TENANT_ID;
      return h;
    }

    function updateCommentCount(count) {
      commentCountEl.textContent = `💬 ${count}`;
    }

    function load() {
      fetch(`${API}/api/page/${encodeURIComponent(pageKey)}`, { headers: headers() })
        .then(r => r.json())
        .then(data => {
          countEl.textContent = parseInt(data.likes ?? 0, 10);

          const comments = data.comments || [];
          updateCommentCount(comments.length);

          list.innerHTML = "";
          comments.forEach(c => {
            const wrap = document.createElement("div");
            wrap.className = "lb-comment";

            const nameEl = document.createElement("div");
            nameEl.className = "lb-name";
            nameEl.textContent = c.name;

            const textEl = document.createElement("div");
            textEl.textContent = c.comment;

            wrap.appendChild(nameEl);
            wrap.appendChild(textEl);
            list.appendChild(wrap);
          });
        })
        .catch(err => console.error("Failed to load page data:", err));
    }

    load();
    setInterval(load, 5000);

    likeBtn.onclick = () => {
      if (likeBtn.disabled) return;

      likeBtn.classList.add("pop");
      setTimeout(() => likeBtn.classList.remove("pop"), 300);

      fetch(`${API}/api/like`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ page_key: pageKey })
      })
        .then(r => r.json())
        .then(data => {
          countEl.textContent = parseInt(data.likes ?? 0, 10);
          localStorage.setItem(likedKey, "1");
          likeBtn.disabled = true;
        });
    };

    container.querySelector(".lb-send").onclick = () => {
      const text = container.querySelector(".lb-text").value.trim();
      if (!text) return;

      const typedName = container.querySelector(".lb-name").value.trim();

      fetch(`${API}/api/comment`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ page_key: pageKey, name: typedName, comment: text })
      })
        .then(r => r.json())
        .then(data => {
          container.querySelector(".lb-text").value = "";

          const commentName = data.name || typedName || "User";

          const wrap = document.createElement("div");
          wrap.className = "lb-comment";

          const nameEl = document.createElement("div");
          nameEl.className = "lb-name";
          nameEl.textContent = commentName;

          const textEl = document.createElement("div");
          textEl.textContent = text;

          wrap.appendChild(nameEl);
          wrap.appendChild(textEl);

          list.prepend(wrap);
          updateCommentCount(list.children.length);

          list.classList.add("open");
          toggleBtn.classList.add("open");
        });
    };

    toggleBtn.onclick = () => {
      list.classList.toggle("open");
      toggleBtn.classList.toggle("open");
    };
  });
})();
