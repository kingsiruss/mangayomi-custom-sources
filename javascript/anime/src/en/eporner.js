const mangayomiSources = [{
    "name": "Eporner",
    "lang": "en",
    "baseUrl": "https://www.eporner.com",
    "apiUrl": "",
    "iconUrl": "https://www.eporner.com/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.0",
    "isNsfw": true,
    "sourceCodeUrl": "https://raw.githubusercontent.com/kingsiruss/mangayomi-custom-sources/main/javascript/anime/src/en/eporner.js",
    "sourceCodeLanguage": 1
}];

class DefaultExtension extends MProvider {
    getHeaders(url) {
        return {
            "Referer": this.source.baseUrl,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        };
    }

    async getPopular(page) {
        const res = await new Client().get(`${this.source.baseUrl}/best/`, this.getHeaders());
        return this.parseList(res.body);
    }

    async getLatestUpdates(page) {
        const res = await new Client().get(`${this.source.baseUrl}/new/`, this.getHeaders());
        return this.parseList(res.body);
    }

    async search(query, page, filters) {
        const url = `${this.source.baseUrl}/search/?q=${encodeURIComponent(query)}&page=${page || 1}`;
        const res = await new Client().get(url, this.getHeaders());
        return this.parseList(res.body);
    }

    parseList(html) {
        const doc = new Document(html);
        const list = [];
        const items = doc.select("div.mb");
        for (const item of items) {
            const a = item.selectFirst("a");
            if (!a) continue;
            const name = (a.attr("title") || a.text || "").trim();
            let link = a.attr("href") || "";
            if (link && !link.startsWith("http")) link = this.source.baseUrl + link;
            const img = item.selectFirst("img");
            const cover = img ? (img.attr("data-src") || img.attr("src") || "") : "";
            if (name && link) list.push({ name, link, imageUrl: cover });
        }
        return { list, hasNextPage: list.length >= 10 };
    }

    async getDetail(url) {
        const res = await new Client().get(url, this.getHeaders());
        const doc = new Document(res.body);
        const title = (doc.selectFirst("h1")?.text || "Video").trim();
        return {
            name: title,
            description: "",
            status: 5,
            chapters: [{ name: "Watch", url: url, dateUpload: Date.now().toString() }]
        };
    }

    async getVideoList(url) {
        const res = await new Client().get(url, this.getHeaders());
        const html = res.body;
        const videos = [];
        const matches = html.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/g) || [];
        for (const src of [...new Set(matches)]) {
            videos.push({
                url: src,
                originalUrl: src,
                quality: src.includes("2160") ? "2160p" : src.includes("1080") ? "1080p" : src.includes("720") ? "720p" : "Auto"
            });
        }
        if (videos.length === 0) {
            videos.push({ url: url, originalUrl: url, quality: "Auto" });
        }
        return videos;
    }
}
