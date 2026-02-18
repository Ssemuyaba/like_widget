// Lite Like Widget - Polished Version with Global Like Limit

(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const containers = document.querySelectorAll(".lite-likebar");

    containers.forEach(container => {
      const pageKey = container.getAttribute("data-page-key");
      const API = container.getAttribute("data-api");

      if (!pageKey || !API) {
        console.error("LikeBar: Missing page key or API URL");
        return;
      }

      // Render widget HTML + CSS
      container.innerHTML = `
        <style>
          .lite-likebar .lb-wrapper {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 12px;
            border-radius: 12px;
            background: #fff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            font-family: 'Segoe UI', sans-serif;
            font-size: 0.95rem;
            flex-wrap: wrap;
          }
          .lite-likebar .lb-like-group,
          .lite-likebar .lb-comment-group { display: flex; align-items: center; gap: 6px; }
          .lite-likebar .lb-like {
            font-size: 1.5rem;
            cursor: pointer;
            background: none;
            border: none;
            padding: 4px;
            transition: transform 0.2s ease;
          }
          .lite-likebar .lb-like.pop { transform: scale(1.5); }
          .lite-likebar .lb-count { font-weight: 600; color: #e74c3c; }
          .lite-likebar .lb-comment-count { font-weight: 500; color: #3498db; }
          .lite-likebar .lb-toggle {
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.2s ease;
            border: none;
            background: none;
          }
          .lite-likebar .lb-toggle.open { transform: rotate(180deg); }
          .lite-likebar .lb-name, 
          .lite-likebar .lb-text, 
          .lite-likebar .lb-send {
            display: none;
            margin-top: 4px;
            padding: 4px 6px;
            border: 1px solid #ccc;
            border-radius: 6px;
            font-size: 0.9rem;
          }
          .lite-likebar .lb-send {
            background: #3498db;
            color: #fff;
            border: none;
            cursor: pointer;
            transition: background 0.2s;
          }
          .lite-likebar .lb-send:hover { background: #2980b9; }
          .lite-likebar .lb-list {
            display: none;
            flex-direction: column;
            width: 100%;
            margin-top: 6px;
            gap: 4px;
          }
          .lite-likebar .lb-list.open { display: flex; }
          .lite-likebar .lb-comment {
            background: #f9f9f9;
            padding: 6px 8px;
            border-radius: 8px;
            font-size: 0.9rem;
          }
          .lite-likebar .lb-comment .lb-name {
            font-weight: 600;
            margin-bottom: 2px;
            color: #2c3e50;
          }
          @media (max-width: 600px) {
            .lite-likebar .lb-wrapper {
              flex-direction: column;
              align-items: flex-start;
            }
            .lite-likebar .lb-like-group,
            .lite-likebar .lb-comment-group {
              gap: 10px;
            }
          }
        </style>

        <div class="lb-wrapper">
          <div class="lb-like-group">
            <button class="lb-like" aria-label="Like">❤️</button>
            <span class="lb-count">0</span>
          </div>
          <div class="lb-comment-group">
            <span class="lb-comment-count">💬 0</span>
            <button class="lb-toggle">&#9660;</button>
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

      const headers = () => ({ "Content-Type": "application/json" });
      const updateCommentCount = (count) => { commentCountEl.textContent = `💬 ${count}`; };

      // Initialize page in DB then load data
      fetch(`${API}/api/page/init`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ page_key: pageKey })
      })
      .then(() => load())
      .catch(err => console.error("Init page failed:", err));

      const load = () => {
        fetch(`${API}/api/page/${encodeURIComponent(pageKey)}`, { headers: headers() })
          .then(r => r.json())
          .then(data => {
            countEl.textContent = parseInt(data.likes ?? 0, 10) || 0;
            list.innerHTML = "";
            const comments = data.comments || [];
            updateCommentCount(comments.length);

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

            // Global like limit feedback
            if (data.error && data.error.includes("total like limit")) {
              likeBtn.disabled = true;
              likeBtn.title = "You have reached your total like limit!";
            }
          })
          .catch(err => console.error("LikeWidget load failed:", err));
      };

      load();
      setInterval(load, 5000);

      // Like button
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
          if (data.error && data.error.includes("total like limit")) {
            likeBtn.disabled = true;
            likeBtn.title = "You have reached your like limit!";
            return;
          }

          countEl.textContent = parseInt(data.likes ?? 0, 10) || 0;
          localStorage.setItem(likedKey, "1");
          likeBtn.disabled = true;
        });
      };

      // Send comment
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

      // Toggle comments
      toggleBtn.onclick = () => {
        const show = !list.classList.contains("open");
        list.classList.toggle("open", show);
        toggleBtn.classList.toggle("open", show);

        const nameInput = container.querySelector(".lb-name");
        const textInput = container.querySelector(".lb-text");
        const sendBtn = container.querySelector(".lb-send");

        [nameInput, textInput, sendBtn].forEach(el => {
          el.style.display = show ? "inline-block" : "none";
          el.style.width = "calc(100% - 12px)";
        });
      };
    });
  });
})();
