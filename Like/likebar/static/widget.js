
<style>
/* Horizontal Instagram-style Lite-Like */
.lite-likebar .lb-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 10px;
  background: #fff;
  font-family: sans-serif;
}

.lite-likebar .lb-like-group,
.lite-likebar .lb-comment-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.lite-likebar .lb-like {
  font-size: 1.4rem;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.lite-likebar .lb-like.pop {
  transform: scale(1.4);
}

.lite-likebar .lb-count {
  font-weight: 600;
  color: #333;
}

.lite-likebar .lb-comment-count {
  font-weight: 500;
  color: #555;
}

/* Hide input/textarea by default, show only when toggled */
.lite-likebar .lb-name,
.lite-likebar .lb-text,
.lite-likebar .lb-send {
  display: none;
}

/* Toggle button style */
.lite-likebar .lb-toggle {
  cursor: pointer;
  font-size: 0.9rem;
  transition: transform 0.2s ease;
}

.lite-likebar .lb-toggle.open {
  transform: rotate(180deg);
}

/* Comments list */
.lite-likebar .lb-list {
  display: none;
  flex-direction: column;
  margin-top: 8px;
  gap: 4px;
}

.lite-likebar .lb-list.open {
  display: flex;
}

.lite-likebar .lb-comment {
  background: #f3f3f3;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.lite-likebar .lb-comment .lb-name {
  font-weight: 600;
  margin-bottom: 2px;
}
</style>

<div class="lite-likebar" data-page-key="demo-page" data-api="https://your-api.com"></div>

<script>
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

        // Show/hide input and send when comments open
        const show = list.classList.contains("open");
        container.querySelector(".lb-name").style.display = show ? "inline-block" : "none";
        container.querySelector(".lb-text").style.display = show ? "inline-block" : "none";
        container.querySelector(".lb-send").style.display = show ? "inline-block" : "none";
      };

    });
  })();
});
</script>

