// public/script.js
document.addEventListener("DOMContentLoaded", () => {
  const platformsCheckboxes = document.getElementById("platforms-checkboxes");
  const platformDetailsContainer = document.getElementById(
    "platform-details-container"
  );
  const generateBtn = document.getElementById("generate-btn");
  const resultsContainer = document.getElementById("results-container");
  const statsCards = document.getElementById("stats-cards");
  const markdownSnippet = document.getElementById("markdown-snippet");
  const copyMarkdownBtn = document.getElementById("copy-markdown");

  let availablePlatforms = {};
  const selectedPlatformDetails = {};

  // Fetch available platforms
  async function fetchPlatforms() {
    try {
      const response = await fetch("/platforms");
      availablePlatforms = await response.json();

      // Populate platforms checkboxes
      Object.entries(availablePlatforms).forEach(
        ([platformKey, platformData]) => {
          const checkbox = document.createElement("div");
          checkbox.innerHTML = `
                    <label class="flex items-center">
                        <input 
                            type="checkbox" 
                            name="platform" 
                            value="${platformKey}" 
                            class="platform-checkbox mr-2"
                        >
                        <span>${platformData.name}</span>
                    </label>
                `;
          platformsCheckboxes.appendChild(checkbox);
        }
      );

      // Add event listeners to platform checkboxes
      const platformCheckboxes =
        document.querySelectorAll(".platform-checkbox");
      platformCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", handlePlatformSelection);
      });
    } catch (error) {
      console.error("Error fetching platforms:", error);
    }
  }

  // Handle platform selection
  function handlePlatformSelection(e) {
    const platformKey = e.target.value;
    const platformData = availablePlatforms[platformKey];

    if (e.target.checked) {
      // Create platform-specific input section
      const platformSection = document.createElement("div");
      platformSection.id = `${platformKey}-section`;
      platformSection.className = "platform-section bg-gray-50 p-4 rounded-lg";

      platformSection.innerHTML = `
                <h3 class="text-lg font-semibold mb-4">${
                  platformData.name
                } Details</h3>
                <div class="mb-4">
                    <label class="block text-gray-700 font-bold mb-2" for="${platformKey}-username">
                        Username
                    </label>
                    <input 
                        type="text" 
                        id="${platformKey}-username" 
                        placeholder="Enter ${platformData.name} username" 
                        class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 platform-username"
                    >
                </div>
                <div>
                    <h4 class="font-semibold mb-2">Select Features</h4>
                    <div class="grid grid-cols-2 gap-2">
                        ${platformData.features
                          .map(
                            (feature) => `
                            <label class="flex items-center">
                                <input 
                                    type="checkbox" 
                                    name="${platformKey}-feature" 
                                    value="${feature}" 
                                    class="platform-feature mr-2"
                                >
                                <span>${feature
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (l) =>
                                    l.toUpperCase()
                                  )}</span>
                            </label>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            `;

      platformDetailsContainer.appendChild(platformSection);

      // Store reference to this platform's section
      selectedPlatformDetails[platformKey] = {
        section: platformSection,
        username: null,
        features: [],
      };
    } else {
      // Remove platform section if unchecked
      const sectionToRemove = document.getElementById(`${platformKey}-section`);
      if (sectionToRemove) {
        platformDetailsContainer.removeChild(sectionToRemove);
        delete selectedPlatformDetails[platformKey];
      }
    }

    // Update generate button visibility
    updateGenerateButtonVisibility();
  }

  // Update generate button visibility
  function updateGenerateButtonVisibility() {
    const platformCheckboxes = document.querySelectorAll(
      ".platform-checkbox:checked"
    );

    if (platformCheckboxes.length > 0) {
      generateBtn.classList.remove("hidden");
    } else {
      generateBtn.classList.add("hidden");
    }
  }

  // Generate stats
  async function generateStats() {
    // Validate and collect platform details
    const platformsToGenerate = [];

    Object.entries(selectedPlatformDetails).forEach(
      ([platformKey, details]) => {
        const usernameInput =
          details.section.querySelector(".platform-username");
        const username = usernameInput.value.trim();

        if (!username) {
          alert(
            `Please enter username for ${availablePlatforms[platformKey].name}`
          );
          return;
        }

        // Collect selected features
        const selectedFeatures = Array.from(
          details.section.querySelectorAll(".platform-feature:checked")
        ).map((checkbox) => checkbox.value);

        if (selectedFeatures.length === 0) {
          alert(
            `Please select at least one feature for ${availablePlatforms[platformKey].name}`
          );
          return;
        }

        platformsToGenerate.push({
          platform: platformKey,
          username: username,
          features: selectedFeatures,
        });
      }
    );

    // Validate all platforms
    if (
      platformsToGenerate.length !== Object.keys(selectedPlatformDetails).length
    ) {
      return;
    }

    try {
      const response = await fetch("/generate-stats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ platforms: platformsToGenerate }),
      });

      const data = await response.json();

      // Clear previous results
      statsCards.innerHTML = "";

      // Generate stats cards
      data.stats.forEach((stat) => {
        const card = document.createElement("div");
        card.className = "bg-white p-4 rounded-lg shadow-md";

        // Create card content based on platform and selected features
        card.innerHTML = `
                <h3 class="text-xl font-bold mb-4">${stat.platform} Stats</h3>
                ${Object.entries(stat)
                  .filter(([key]) => key !== "platform")
                  .map(
                    ([key, value]) => `
                        <p class="mb-2">
                            <span class="font-semibold">${key
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) =>
                                l.toUpperCase()
                              )}:</span> 
                            ${value}
                        </p>
                    `
                  )
                  .join("")}
            `;

        statsCards.appendChild(card);
      });

      // Set markdown snippet
      markdownSnippet.value = data.markdownSnippet;

      // Show results
      resultsContainer.classList.remove("hidden");
    } catch (error) {
      console.error("Error generating stats:", error);
      alert("Failed to generate stats. Please try again.");
    }
  }

  // Copy markdown to clipboard
  function copyMarkdown() {
    markdownSnippet.select();
    document.execCommand("copy");
    alert("Markdown copied to clipboard!");
  }

  // Add this to your existing script
  async function generateBadge() {
    // Validate and collect platform details (similar to generateStats())
    const platformsToGenerate = [];

    Object.entries(selectedPlatformDetails).forEach(
      ([platformKey, details]) => {
        const usernameInput =
          details.section.querySelector(".platform-username");
        const username = usernameInput.value.trim();

        if (!username) {
          alert(
            `Please enter username for ${availablePlatforms[platformKey].name}`
          );
          return;
        }

        const selectedFeatures = Array.from(
          details.section.querySelectorAll(".platform-feature:checked")
        ).map((checkbox) => checkbox.value);

        if (selectedFeatures.length === 0) {
          alert(
            `Please select at least one feature for ${availablePlatforms[platformKey].name}`
          );
          return;
        }

        platformsToGenerate.push({
          platform: platformKey,
          username: username,
          features: selectedFeatures,
        });
      }
    );

    // Validate all platforms
    if (
      platformsToGenerate.length !== Object.keys(selectedPlatformDetails).length
    ) {
      return;
    }

    try {
      const response = await fetch("/generate-badge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ platforms: platformsToGenerate }),
      });

      const data = await response.json();

      // Display badge URL
      const badgeSection = document.createElement("div");
      badgeSection.innerHTML = `
            <h3 class="text-lg font-semibold mt-4">Dynamic Badge</h3>
            <div class="bg-gray-100 p-4 rounded-lg">
                <p class="mb-2">Markdown to embed in your README:</p>
                <code class="block bg-white p-2 rounded border">
                    ![My Profile Stats](${data.badgeUrl})
                </code>
            </div>
        `;

      // Add to results container or create a new section
      const existingBadgeSection = document.getElementById("badge-section");
      if (existingBadgeSection) {
        existingBadgeSection.replaceWith(badgeSection);
      } else {
        badgeSection.id = "badge-section";
        resultsContainer.appendChild(badgeSection);
      }

      // Show results
      resultsContainer.classList.remove("hidden");
    } catch (error) {
      console.error("Error generating badge:", error);
      alert("Failed to generate badge. Please try again.");
    }
  }

  // Add this to your event listeners
  generateBtn.addEventListener("click", generateStats);
  const generateBadgeBtn = document.getElementById("generate-badge-btn");
  if (generateBadgeBtn) {
    generateBadgeBtn.addEventListener("click", generateBadge);
  }

  // Initialize
  fetchPlatforms();

  // Event Listeners
  generateBtn.addEventListener("click", generateStats);
  copyMarkdownBtn.addEventListener("click", copyMarkdown);
});
