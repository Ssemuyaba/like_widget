(function () {
  const script = document.currentScript;
  const pageKey = script.getAttribute("data-page-key");
  const API = script.getAttribute("data-api");
  const TENANT_ID = script.getAttribute("data-tenant-id") || null;

  if (!pageKey || !API) {
    console.error("LikeBar: Missing page key or API URL");
    return;
  }

  const container = document.getElementById("lite-likebar");
  if (!container) return;

  container.innerHTML = `
    <div class="lb-wrapper">
      <div class="lb-top">

        <div class="lb-like-group">
          <button id="lb-like" aria-label="Like">❤️</button>
          <span id="lb-count">0</span>
        </div>

        <div class="lb-comment-group">
          <span id="lb-comment-count">💬 0</span>
          <button id="lb-toggle" title="Toggle comments">&#9660;</button>
        </div>

        <input id="lb-name" placeholder="Your name (optional)" />
        <textarea id="lb-text" placeholder="Write a comment..."></textarea>
        <button id="lb-send">Comment</button>

      </div>

      <div id="lb-list"></div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    .lb-wrapper {
      font-family: Arial, sans-serif;
      border: 1px solid #e0e0e0;
      padding: 14px;
      max-width: 720px;
      border-radius: 10px;
      background: #fff;
    }

    .lb-top {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }

    .lb-like-group,
    .lb-comment-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    #lb-like {
      background: none;
      border: none;
      font-size: 1.8rem;
      cursor: pointer;
      transition: transform 0.2s ease;
      min-height: 42px;
    }

    #lb-like:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    #lb-count,
    #lb-comment-count {
      font-weight: bold;
      min-width: 24px;
    }

    #lb-toggle {
      border: 1px solid #ccc;
      background: #f5f5f5;
      border-radius: 6px;
      cursor: pointer;
      padding: 6px 10px;
      transition: transform 0.3s ease;
      min-height: 42px;
    }

    #lb-toggle.open {
      transform: rotate(180deg);
    }

    #lb-name,
    #lb-text {
      width: 100%;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 6px;
      font-size: 0.95rem;
      box-sizing: border-box;
    }

    #lb-text {
      min-height: 80px;
      resize: vertical;
    }

    #lb-send {
      padding: 10px 14px;
      background: #0d6efd;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      min-height: 44px;
    }

    #lb-send:hover {
      opacity: 0.9;
    }

    #lb-list {
      margin-top: 12px;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    #lb-list.open {
      max-height: 300px;
      overflow-y: auto;
    }

    .lb-comment {
      border-top: 1px solid #eee;
      padding-top: 8px;
      margin-top: 8px;
      animation: fadeIn 0.2s ease;
    }

    .lb-name {
      font-weight: bold;
      margin-bottom: 2px;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes pop {
      0% { transform: scale(1); }
      50% { transform: scale(1.3); }
      100% { transform: scale(1); }
    }

    #lb-like.pop {
      animation: pop 0.3s ease;
    }

    /* 📱 Mobile Optimization */
    @media (max-width: 600px) {
      .lb-top {
        flex-direction: column;
        align-items: stretch;
      }

      .lb-like-group,
      .lb-comment-group {
        justify-content: space-between;
        width: 100%;
      }

      #lb-send,
      #lb-toggle {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(style);

  const likeBtn = document.getElementById("lb-like");
  const countEl = document.getElementById("lb-count");
  const commentCountEl = document.getElementById("lb-comment-count");
  const list = document.getElementById("lb-list");
  const toggleBtn = document.getElementById("lb-toggle");
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
        const cleanLikes = parseInt(rawLikes, 10) || 0;
        countEl.textContent = cleanLikes;


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
       const rawLikes = data.likes ?? data.total_likes ?? 0;
       countEl.textContent = parseInt(rawLikes, 10) || 0;

        localStorage.setItem(likedKey, "1");
        likeBtn.disabled = true;
      });
  };

  // COMMENT
  document.getElementById("lb-send").onclick = () => {
    const text = document.getElementById("lb-text").value.trim();
    if (!text) return;

    const typedName = document.getElementById("lb-name").value.trim();

    fetch(`${API}/api/comment`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ page_key: pageKey, name: typedName, comment: text })
    })
      .then(r => r.json())
      .then(data => {
        document.getElementById("lb-text").value = "";

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

})();
