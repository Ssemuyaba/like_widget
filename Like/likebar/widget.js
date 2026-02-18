document.addEventListener("DOMContentLoaded", () => {
  (function () {
    const script = document.currentScript;
    const TENANT_ID = script?.getAttribute("data-tenant-id") || null;

    const containers = document.querySelectorAll(".lite-likebar");
    containers.forEach(container => {
      const pageKey = container.getAttribute("data-page-key");
      const API = container.getAttribute("data-api");

      if (!pageKey || !API) {
        console.error("LikeBar: Missing page key or API URL");
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

      // Elements inside this container
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
            const rawLikes = data.likes ?? data.total_likes ?? 0;
            countEl.textContent = parseInt(rawLikes, 10) || 0;

            const comments = data.comments || [];
            updateCommentCount(comments.length);

            list.innerHTML = "";
            comments.forEach(c => {
              const wrap = document.createElement("div");
              wrap.className = "lb-comment";

              const name = document.createElement("div");
              name.className = "lb-name";
              name.textContent = c.name;

              const text = document.createElement("div");
              text.textContent = c.comment;

              wrap.appendChild(name);
              wrap.appendChild(text);
              list.appendChild(wrap);
            });
          })
          .catch(err => console.error("Failed to load page data:", err));
      }

      load();
      setInterval(load, 5000);

      // LIKE
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
          countEl.textContent = parseInt(data.likes ?? 0, 10) || 0;
          localStorage.setItem(likedKey, "1");
          likeBtn.disabled = true;
        });
      };

      // COMMENT
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

      // TOGGLE
      toggleBtn.onclick = () => {
        list.classList.toggle("open");
        toggleBtn.classList.toggle("open");
      };

    }); // end forEach container
  })();
});
