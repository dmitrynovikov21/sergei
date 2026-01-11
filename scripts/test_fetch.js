
(async () => {
    try {
        console.log("Fetching Anthropic...");
        const res = await fetch('https://api.anthropic.com');
        console.log("Status:", res.status);
        console.log("Headers:", JSON.stringify([...res.headers.entries()]));
    } catch (error) {
        console.error("Fetch Error:", error);
        if (error.cause) console.error("Cause:", error.cause);
    }
})();
