// --- Simple site config ---
const SITE_CONFIG = {
  githubUsername: 'im4vk', // <-- set to your GitHub username
  includeForksByDefault: true, // Show forked repos by default
  projectsPerPage: 12, // Number of projects to show per page
};

// --- Utilities ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// --- Resume Setup (PDF Only) ---
async function resumeSetup() {
  const pdfUrl = new URL('assets/resume.pdf', document.baseURI).toString();
  const viewer = $('#resumeViewer');

  try {
    // Check if compiled PDF exists
    const pdfResponse = await fetch(pdfUrl, { method: 'HEAD', cache: 'no-store' });
    
    if (pdfResponse.ok) {
      //console.log('[resume] Loading compiled PDF resume');
      
      // Display PDF using embed
      viewer.innerHTML = `
        <div class="pdf-container" style="width: 100%; height: 800px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; background: #f5f5f5;">
          <embed src="${pdfUrl}" type="application/pdf" width="100%" height="100%" style="border: none;">
          <div class="pdf-fallback" style="display: none; padding: 40px; text-align: center; color: #666;">
            <h3>PDF Viewer Not Supported</h3>
            <p>Your browser doesn't support embedded PDF viewing.</p>
            <p>Please use a modern browser to view the resume.</p>
          </div>
        </div>
      `;
      
      viewer.classList.add('has-resume');
      
      // PDF is loaded and displayed
      
      // Check if embed loaded successfully
      setTimeout(() => {
        const embed = viewer.querySelector('embed');
        const fallback = viewer.querySelector('.pdf-fallback');
        if (embed && embed.offsetHeight === 0) {
          embed.style.display = 'none';
          fallback.style.display = 'block';
        }
      }, 2000);
      
      // PDF is ready - no additional setup needed for download link
      
      //console.log('[resume] PDF resume loaded successfully');
      
    } else {
      throw new Error('PDF not found');
    }
    
  } catch (error) {
    //console.error('[resume] Failed to load PDF resume:', error);
    viewer.innerHTML = `
      <div style="color: #666; text-align: center; padding: 60px 20px;">
        <h3>Resume Not Available</h3>
        <p>The resume PDF is being compiled by GitHub Actions.</p>
        <p>Please check back in a few minutes, or add your LaTeX resume to <code>assets/resume.tex</code> and push to trigger compilation.</p>
        <div style="margin-top: 20px;">
          <a href="https://github.com/${SITE_CONFIG.githubUsername}/${SITE_CONFIG.githubUsername}.github.io/actions" target="_blank" style="display: inline-block; padding: 10px 20px; background: #043670; color: white; text-decoration: none; border-radius: 4px;">
            🔄 Check GitHub Actions
          </a>
        </div>
      </div>
    `;
  }
}

// --- GitHub Projects ---
async function fetchGitHubRepos() {
  const username = SITE_CONFIG.githubUsername;
  const apiUrl = `https://api.github.com/users/${username}/repos?sort=updated&per_page=100&type=all`;
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
    
    const repos = await response.json();
    //console.log(`[github] Fetched ${repos.length} total repositories`);
    
    const filtered = repos.filter(repo => !repo.private && (SITE_CONFIG.includeForksByDefault || !repo.fork));
    //console.log(`[github] After filtering: ${filtered.length} repositories (private: ${repos.filter(r => r.private).length}, forks: ${repos.filter(r => r.fork).length})`);
    
    return filtered;
  } catch (error) {
    //console.error('[github] Failed to fetch repositories:', error);
    return [];
  }
}

async function fetchReadme(username, repoName) {
  const readmeUrl = `https://api.github.com/repos/${username}/${repoName}/readme`;
  
  try {
    const response = await fetch(readmeUrl);
    if (!response.ok) return null;
    
    const data = await response.json();
    // Decode base64 content
    const content = atob(data.content);
    return content;
  } catch (error) {
    //console.log(`[github] No README found for ${repoName}`);
    return null;
  }
}

function parseMarkdownToHtml(markdown) {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Code blocks (must be done before other replacements)
  html = html.replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  
  // Headers (6 levels)
  html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
  html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr>');
  html = html.replace(/^\*\*\*$/gim, '<hr>');
  
  // Blockquotes
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
  
  // Lists (unordered)
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\+ (.*$)/gim, '<li>$1</li>');
  
  // Lists (ordered)
  html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
  
  // Wrap consecutive list items in ul/ol tags
  html = html.replace(/(<li>.*<\/li>)/gs, function(match) {
    return '<ul>' + match + '</ul>';
  });
  
  // Bold and italic (order matters)
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/\_\_\_(.*?)\_\_\_/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\_\_(.*?)\_\_/g, '<strong>$1</strong>');
  html = html.replace(/\_(.*?)\_/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  
  // Inline code (after code blocks)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Strikethrough
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
  
  // Tables (basic support)
  html = html.replace(/\|(.+)\|/g, function(match, content) {
    const cells = content.split('|').map(cell => cell.trim());
    const cellTags = cells.map(cell => `<td>${cell}</td>`).join('');
    return `<tr>${cellTags}</tr>`;
  });
  
  // Wrap table rows in table tags
  html = html.replace(/(<tr>.*<\/tr>)/gs, function(match) {
    return '<table>' + match + '</table>';
  });
  
  // Convert double line breaks to paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>\s*<\/p>/g, '');
  
  // Convert single line breaks to <br> within paragraphs
  html = html.replace(/\n/g, '<br>');
  
  // Clean up nested lists
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  html = html.replace(/<\/ol>\s*<ol>/g, '');
  
  return html;
}

let currentPage = 1;
let currentRepos = [];
let searchSetupDone = false;

function removePaginationControls() {
  const existingPagination = document.querySelector('.projects-pagination');
  if (existingPagination) {
    existingPagination.remove();
  }
}

function renderProjects(repos) {
  const container = $('#projectsGrid');
  if (!container) return;

  if (repos.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666;">No public repositories found.</p>';
    return;
  }

  // Store repos data globally for modal access
  window.reposData = repos;
  currentRepos = repos;
  currentPage = 1;

  renderPage(repos, currentPage);
  
  // Set up search functionality only once
  if (!searchSetupDone) {
    setupProjectSearch(repos);
    searchSetupDone = true;
  }
}

function renderPage(repos, page) {
  const container = $('#projectsGrid');
  const perPage = getProjectsPerPage();
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const pageRepos = repos.slice(startIndex, endIndex);

  container.innerHTML = pageRepos.map((repo, index) => `
    <div class="project-card" data-repo="${repo.name}" onclick="openProjectModal('${repo.name}')">
      <div class="project-header">
        <div class="project-title">
          <h3>${repo.name}</h3>
          <span class="click-hint">Click</span>
        </div>
        <div class="project-stats">
          ${repo.language ? `<span class="language">${repo.language}</span>` : ''}
          <span class="stars">⭐ ${formatNumber(repo.stargazers_count)}</span>
          <span class="forks">🍴 ${formatNumber(repo.forks_count)}</span>
        </div>
      </div>
      
      <p class="project-description">${repo.description || 'No description available.'}</p>
      
      <div class="project-links" onclick="event.stopPropagation()">
        <div class="project-actions">
          <a href="${repo.html_url}" target="_blank" rel="noopener" class="repo-link">
            📁 Repository
          </a>
          ${repo.homepage ? `<a href="${repo.homepage}" target="_blank" rel="noopener" class="demo-link">🔗 Live Demo</a>` : ''}
        </div>
        <div class="project-meta">
          <span class="updated">Updated ${new Date(repo.updated_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  `).join('');
  
  // Add pagination controls
  renderPaginationControls(repos, page);
  
  // Note: Search functionality is set up once in renderProjects, not here
}

function renderPaginationControls(repos, currentPage) {
  const perPage = getProjectsPerPage();
  const totalPages = Math.ceil(repos.length / perPage);
  
  // Always remove existing pagination first
  removePaginationControls();
  
  if (totalPages <= 1) return; // No pagination needed
  
  const container = $('#projectsGrid');
  const paginationHTML = `
    <div class="projects-pagination">
      <button onclick="changePage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
        ← Previous
      </button>
      
      <span>
        Page ${currentPage} of ${totalPages} (${repos.length} repositories)
      </span>
      
      <button onclick="changePage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
        Next →
      </button>
    </div>
  `;
  
  container.insertAdjacentHTML('afterend', paginationHTML);
}

function changePage(newPage) {
  const perPage = getProjectsPerPage();
  const totalPages = Math.ceil(currentRepos.length / perPage);
  
  if (newPage < 1 || newPage > totalPages) return;
  
  currentPage = newPage;
  
  // Remove existing pagination
  removePaginationControls();
  
  renderPage(currentRepos, currentPage);
  
  // Scroll to top of projects section with header offset
  const projectsSection = document.getElementById('projects');
  const headerHeight = document.querySelector('.site-header').offsetHeight;
  const targetPosition = projectsSection.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
  
  window.scrollTo({
    top: targetPosition,
    behavior: 'smooth'
  });
}

// Modal functions
function openProjectModal(repoName) {
  const repo = window.reposData.find(r => r.name === repoName);
  if (!repo) return;
  
  const modal = document.getElementById('projectModal');
  const modalName = document.getElementById('modalProjectName');
  const modalStats = document.getElementById('modalProjectStats');
  const modalLinks = document.getElementById('modalProjectLinks');
  const modalDescription = document.getElementById('modalProjectDescription');
  const modalReadmeContent = document.getElementById('modalReadmeContent');
  
  // Populate modal content
  modalName.textContent = repo.name;
  
  modalStats.innerHTML = `
    ${repo.language ? `<span class="language">${repo.language}</span>` : ''}
    <span class="stars">⭐ ${formatNumber(repo.stargazers_count)}</span>
    <span class="forks">🍴 ${formatNumber(repo.forks_count)}</span>
    <span class="updated">Updated ${new Date(repo.updated_at).toLocaleDateString()}</span>
  `;
  
  //console.log('Modal stats HTML:', modalStats.innerHTML);
  //console.log('Repo language:', repo.language);
  //console.log('Repo homepage:', repo.homepage);
  
  modalLinks.innerHTML = `
    <a href="${repo.html_url}" target="_blank" rel="noopener" class="repo-link">
      📁 View Repository
    </a>
    ${repo.homepage ? `<a href="${repo.homepage}" target="_blank" rel="noopener" class="demo-link">🔗 Live Demo</a>` : ''}
  `;
  
  //console.log('Modal links HTML:', modalLinks.innerHTML);
  
  modalDescription.innerHTML = `<p>${repo.description || 'No description available.'}</p>`;
  
  // Reset README content
  modalReadmeContent.innerHTML = '<div class="loading">Loading README...</div>';
  
  // Show modal
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  // Load README
  loadModalReadmeContent(repoName, modalReadmeContent);
}

function closeProjectModal() {
  const modal = document.getElementById('projectModal');
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

async function loadModalReadmeContent(repoName, contentElement) {
  try {
    const readme = await fetchReadme(SITE_CONFIG.githubUsername, repoName);
    
    if (readme) {
      const htmlContent = parseMarkdownToHtml(readme);
      contentElement.innerHTML = `<div class="readme-text">${htmlContent}</div>`;
    } else {
      contentElement.innerHTML = '<p class="no-readme">No README available for this repository.</p>';
    }
  } catch (error) {
    //console.error(`Failed to load README for ${repoName}:`, error);
    contentElement.innerHTML = '<p class="error">Failed to load README.</p>';
  }
}

// Close modal when pressing Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeProjectModal();
  }
});

// Store the original full repo list globally for filtering
let allRepos = [];

// Skills pagination
let currentSkillsPage = 1;
let allSkills = [];
const SKILLS_PER_PAGE_DESKTOP = 12;
const SKILLS_PER_PAGE_MOBILE = 6;

// Responsive pagination helpers
function isMobileScreen() {
  return window.innerWidth <= 768;
}

function getSkillsPerPage() {
  return isMobileScreen() ? SKILLS_PER_PAGE_MOBILE : SKILLS_PER_PAGE_DESKTOP;
}

function getProjectsPerPage() {
  return isMobileScreen() ? Math.floor(SITE_CONFIG.projectsPerPage / 2) : SITE_CONFIG.projectsPerPage;
}

// Handle responsive pagination on window resize
function handleResponsivePagination() {
  // Re-render skills pagination if skills are loaded
  if (allSkills.length > 0) {
    // Recalculate current page to maintain position
    const skillsPerPage = getSkillsPerPage();
    const totalPages = Math.ceil(allSkills.length / skillsPerPage);
    
    // Adjust current page if it's now out of bounds
    if (currentSkillsPage > totalPages) {
      currentSkillsPage = totalPages;
    }
    
    renderSkillsPage(allSkills, currentSkillsPage);
  }
  
  // Re-render projects pagination if projects are loaded
  if (currentRepos.length > 0) {
    // Recalculate current page to maintain position
    const projectsPerPage = getProjectsPerPage();
    const totalPages = Math.ceil(currentRepos.length / projectsPerPage);
    
    // Adjust current page if it's now out of bounds
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    
    renderPage(currentRepos, currentPage);
  }
}

// Language analysis and skills
function analyzeRepositoryLanguages(repos) {
  const languageStats = {};
  let totalRepos = 0;

  repos.forEach(repo => {
    if (repo.language) {
      totalRepos++;
      if (languageStats[repo.language]) {
        languageStats[repo.language].count++;
        languageStats[repo.language].repos.push(repo.name);
      } else {
        languageStats[repo.language] = {
          count: 1,
          repos: [repo.name]
        };
      }
    }
  });

  // Convert to array and calculate percentages
  const languageArray = Object.entries(languageStats).map(([language, stats]) => ({
    name: language,
    count: stats.count,
    repos: stats.repos,
    percentage: Math.round((stats.count / totalRepos) * 100)
  }));

  // Sort by count (descending)
  languageArray.sort((a, b) => b.count - a.count);

  return languageArray;
}

function getLanguageClassName(language) {
  const languageMap = {
    'JavaScript': 'javascript',
    'TypeScript': 'typescript',
    'Python': 'python',
    'Java': 'java',
    'C++': 'cpp',
    'C': 'c',
    'C#': 'csharp',
    'PHP': 'php',
    'Ruby': 'ruby',
    'Go': 'go',
    'Rust': 'rust',
    'Swift': 'swift',
    'Kotlin': 'kotlin',
    'Dart': 'dart',
    'HTML': 'html',
    'CSS': 'css',
    'Shell': 'shell'
  };
  
  return languageMap[language] || 'default';
}

function renderSkillsSection(repos) {
  const container = $('#skillsGrid');
  if (!container) return;

  const languages = analyzeRepositoryLanguages(repos);
  
  if (languages.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666;">No language data available from repositories.</p>';
    return;
  }

  // Store all skills globally and reset to page 1
  allSkills = languages;
  currentSkillsPage = 1;

  renderSkillsPage(allSkills, currentSkillsPage);
}

function renderSkillsPage(skills, page) {
  const container = $('#skillsGrid');
  const skillsPerPage = getSkillsPerPage();
  const startIndex = (page - 1) * skillsPerPage;
  const endIndex = startIndex + skillsPerPage;
  const pageSkills = skills.slice(startIndex, endIndex);

  const totalPages = Math.ceil(skills.length / skillsPerPage);
  
  // First, render just the skills grid
  const skillsHTML = `
      ${pageSkills.map(lang => `
        <div class="skill-item">
          <div class="skill-header">
            <span class="skill-name">${lang.name}</span>
            <span class="skill-percentage">${lang.percentage}%</span>
          </div>
          <div class="skill-bar">
            <div class="skill-progress ${getLanguageClassName(lang.name)}" 
                 data-percentage="${lang.percentage}" 
                 style="width: 0%"></div>
          </div>
          <div class="skill-details">
            <span class="repo-count">📁 ${lang.count} ${lang.count === 1 ? 'repository' : 'repositories'}</span>
            <span class="last-used">Used in: ${lang.repos.slice(0, 3).join(', ')}${lang.repos.length > 3 ? ` +${lang.repos.length - 3} more` : ''}</span>
          </div>
        </div>
      `).join('')}
  `;

  container.innerHTML = skillsHTML;

  // Add pagination controls using the same method as projects
  renderSkillsPagination(skills, page);

  // Animate progress bars after a short delay
  setTimeout(() => {
    const progressBars = container.querySelectorAll('.skill-progress');
    progressBars.forEach(bar => {
      const percentage = bar.getAttribute('data-percentage');
      bar.style.width = `${percentage}%`;
    });
  }, 500);
}

function renderSkillsPagination(skills, currentPage) {
  const skillsPerPage = getSkillsPerPage();
  const totalPages = Math.ceil(skills.length / skillsPerPage);
  
  // Always remove existing pagination first
  removeSkillsPagination();
  
  if (totalPages <= 1) return; // No pagination needed
  
  const paginationHTML = `
    <div class="skills-pagination">
      <button onclick="changeSkillsPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
        ← Previous
      </button>
      
      <span>
        Page ${currentPage} of ${totalPages} (${skills.length} skills)
      </span>
      
      <button onclick="changeSkillsPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
        Next →
      </button>
    </div>
  `;
  
  // Insert pagination into the skills section
  const skillsSection = document.getElementById('skills');
  skillsSection.insertAdjacentHTML('beforeend', paginationHTML);
}

function removeSkillsPagination() {
  const existingPagination = document.querySelector('.skills-pagination');
  if (existingPagination) {
    existingPagination.remove();
  }
}

function changeSkillsPage(newPage) {
  const skillsPerPage = getSkillsPerPage();
  const totalPages = Math.ceil(allSkills.length / skillsPerPage);
  
  if (newPage < 1 || newPage > totalPages) return;
  
  currentSkillsPage = newPage;
  
  // Remove existing pagination
  removeSkillsPagination();
  
  renderSkillsPage(allSkills, currentSkillsPage);
  
  // Scroll to skills section with header offset
  const skillsSection = document.getElementById('skills');
  const headerHeight = document.querySelector('.site-header').offsetHeight;
  const targetPosition = skillsSection.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
  
  window.scrollTo({
    top: targetPosition,
    behavior: 'smooth'
  });
}

function setupProjectSearch(initialRepos) {
  // Store the full repo list
  allRepos = initialRepos;
  
  const searchInput = document.getElementById('searchInput');
  const toggleForks = document.getElementById('toggleForks');
  
  function filterAndRender() {
    const searchTerm = searchInput.value.toLowerCase();
    const showForks = toggleForks.checked;
    
    //console.log(`[filter] Search term: "${searchTerm}", Show forks: ${showForks}`);
    //console.log(`[filter] Total repos before filtering: ${allRepos.length}`);
    
    const filtered = allRepos.filter(repo => {
      // Filter by forks
      if (!showForks && repo.fork) return false;
      
      // Filter by search term
      if (searchTerm) {
        const searchableText = `${repo.name} ${repo.description || ''} ${repo.language || ''}`.toLowerCase();
        return searchableText.includes(searchTerm);
      }
      
      return true;
    });
    
    //console.log(`[filter] Repos after filtering: ${filtered.length}`);
    renderFilteredProjects(filtered);
  }
  
  // Only add event listeners if they haven't been added yet
  if (!searchInput.hasAttribute('data-listener-added')) {
    searchInput.addEventListener('input', filterAndRender);
    searchInput.setAttribute('data-listener-added', 'true');
  }
  
  if (!toggleForks.hasAttribute('data-listener-added')) {
    toggleForks.addEventListener('change', filterAndRender);
    toggleForks.setAttribute('data-listener-added', 'true');
  }
}

function renderFilteredProjects(repos) {
  const container = $('#projectsGrid');
  if (!container) return;

  // Always remove existing pagination first
  removePaginationControls();

  if (repos.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666;">No projects match your search.</p>';
    return;
  }

  // Update current repos and reset to page 1 for filtered results
  currentRepos = repos;
  currentPage = 1;
  
  renderPage(repos, currentPage);
}

// --- Main Setup ---
async function setupProjects() {
  try {
    const repos = await fetchGitHubRepos();
    
    // Render skills section first
    renderSkillsSection(repos);
    
    // Then render projects
    renderProjects(repos);
  } catch (error) {
    console.error('Error loading repository data:', error);
    
    // Show error message in skills section if it exists
    const skillsContainer = $('#skillsGrid');
    if (skillsContainer) {
      skillsContainer.innerHTML = `
        <div style="text-align: center; color: #666; padding: 40px;">
          <p><strong>Unable to load repository data</strong></p>
          <p>Please check your internet connection and try refreshing the page.</p>
          <p style="font-size: 0.9em; margin-top: 16px;">Error: ${error.message}</p>
        </div>
      `;
    }
  }
}

// Avatar image switching functionality
function setupAvatarToggle() {
  const characterImg = document.querySelector('.character-img');
  if (!characterImg) return;

  let isOriginal = true;
  const originalSrc = 'assets/avatar.png';
  const alternateSrc = 'assets/profile.jpg';

  characterImg.addEventListener('click', function() {
    // Add transition class
    characterImg.classList.add('switching');
    
    // Change image after a short delay for smooth transition
    setTimeout(() => {
      if (isOriginal) {
        characterImg.src = alternateSrc;
        characterImg.alt = 'Avinash Kumar Profile';
      } else {
        characterImg.src = originalSrc;
        characterImg.alt = 'Avinash Kumar Character';
      }
      isOriginal = !isOriginal;
      
      // Remove transition class after image loads
      setTimeout(() => {
        characterImg.classList.remove('switching');
      }, 50);
    }, 150);
  });

  // Add cursor pointer to indicate clickability
  characterImg.style.cursor = 'pointer';
}

// --- Initialize ---
document.addEventListener('DOMContentLoaded', async () => {
  // Setup smooth scrolling for navigation
  setupSmoothScrolling();
  
  // Setup avatar toggle functionality
  setupAvatarToggle();
  
  // Setup resume (only if resume viewer exists)
  const resumeViewer = $('#resumeViewer');
  if (resumeViewer) {
    await resumeSetup();
  }
  
  // Setup projects (only if projects section exists)
  const projectsGrid = $('#projectsGrid');
  const skillsGrid = $('#skillsGrid');
  
  if (projectsGrid || skillsGrid) {
    await setupProjects();
  }
});

// Handle window resize for responsive pagination
let resizeTimeout;
window.addEventListener('resize', () => {
  // Debounce resize events to avoid excessive re-rendering
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    handleResponsivePagination();
  }, 250);
});

// Enhanced header scroll effect
let lastScrollY = 0;
let ticking = false;

function updateHeader() {
  const scrollY = window.scrollY;
  const header = document.querySelector('.site-header');
  
  if (header) {
    // Add/remove scrolled class based on scroll position
    if (scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }
  
  lastScrollY = scrollY;
  ticking = false;
}

function requestTick() {
  if (!ticking) {
    requestAnimationFrame(updateHeader);
    ticking = true;
  }
}

window.addEventListener('scroll', requestTick);

// Enhanced navigation scrolling with header offset
function setupSmoothScrolling() {
  // Handle navigation links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        const headerHeight = document.querySelector('.site-header').offsetHeight;
        const additionalOffset = 20; // Extra padding for better visual spacing
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight - additionalOffset;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

// Title Animation Functions
let titleAnimationInterval;
const originalTitle = document.title;

function startTitleAnimation() {
    const animations = [
        // // Rotating security icons
        // () => rotatingIconTitle('Avinash Kumar | Security Researcher'),
        // // Typewriter with sparkles
        // () => typewriterTitle('✨ Avinash Kumar | Security Researcher ✨'),
        // Matrix/hacker effect
        () => matrixTitle('Hacked'),
        // Pulsing shield animation
        // () => pulsingShieldTitle('🛡️ Avinash Kumar | Cybersecurity Expert'),
        // // Scrolling with animated icons
        // () => scrollingTitle('🔐💻🔍 Security Expert • Penetration Tester • Avinash Kumar 🔍💻🔐'),
        // // Lock/unlock animation
        // () => lockUnlockTitle('Avinash Kumar | Security Expert'),
        // // Binary code effect
        // () => binaryTitle('Avinash Kumar | Digital Security'),
        // // Glitch with warning icons
        // () => glitchTitle('⚠️ Avinash Kumar ⚠️'),
        // // Loading with tech icons
        // () => progressTitle('🚀 Loading Portfolio...', '✅ Avinash Kumar - Ready!')
    ];
    
    let currentAnimation = 0;
    
    function runNextAnimation() {
        if (animations[currentAnimation]) {
            animations[currentAnimation]().then(() => {
                currentAnimation = (currentAnimation + 1) % animations.length;
                setTimeout(runNextAnimation, 1500); // Wait 1.5 seconds between animations
            });
        }
    }
    
    // Start first animation after 2 seconds
    setTimeout(runNextAnimation, 1000);
}

function typewriterTitle(text) {
    return new Promise((resolve) => {
        let index = 0;
        const interval = setInterval(() => {
            document.title = text.substring(0, index + 1);
            index++;
            if (index >= text.length) {
                clearInterval(interval);
                setTimeout(resolve, 2000);
            }
        }, 150);
    });
}

function blinkingTitle(text) {
    return new Promise((resolve) => {
        let blinks = 0;
        const maxBlinks = 6;
        const interval = setInterval(() => {
            document.title = blinks % 2 === 0 ? text + ' |' : text + ' ';
            blinks++;
            if (blinks >= maxBlinks) {
                clearInterval(interval);
                document.title = text;
                setTimeout(resolve, 1000);
            }
        }, 500);
    });
}

function scrollingTitle(text) {
    return new Promise((resolve) => {
        let position = 0;
        const visibleLength = 25;
        const paddedText = '     ' + text + '     '; // Add spacing
        let cycles = 0;
        const maxCycles = 2;
        
        const interval = setInterval(() => {
            const visibleText = paddedText.substring(position, position + visibleLength);
            document.title = visibleText;
            position++;
            
            if (position >= paddedText.length - visibleLength) {
                position = 0;
                cycles++;
                if (cycles >= maxCycles) {
                    clearInterval(interval);
                    setTimeout(resolve, 500);
                }
            }
        }, 200);
    });
}

function glitchTitle(text) {
    return new Promise((resolve) => {
        const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        let glitches = 0;
        const maxGlitches = 8;
        
        const interval = setInterval(() => {
            if (glitches % 2 === 0) {
                // Glitch version
                let glitched = '';
                for (let i = 0; i < text.length; i++) {
                    if (Math.random() < 0.3) {
                        glitched += glitchChars[Math.floor(Math.random() * glitchChars.length)];
                    } else {
                        glitched += text[i];
                    }
                }
                document.title = glitched;
            } else {
                // Normal version
                document.title = text;
            }
            
            glitches++;
            if (glitches >= maxGlitches) {
                clearInterval(interval);
                document.title = text;
                setTimeout(resolve, 1000);
            }
        }, 150);
    });
}

function progressTitle(loadingText, completeText) {
    return new Promise((resolve) => {
        let progress = 0;
        const interval = setInterval(() => {
            const bars = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
            document.title = `${loadingText} [${bars}] ${progress}%`;
            progress += 10;
            
            if (progress > 100) {
                clearInterval(interval);
                document.title = completeText;
                setTimeout(resolve, 2000);
            }
        }, 200);
    });
}

// New icon-based animation functions
function rotatingIconTitle(text) {
    return new Promise((resolve) => {
        const securityIcons = ['🔒', '🔐', '🛡️', '🔑', '🚨', '⚡', '🔥', '💎'];
        let iconIndex = 0;
        let rotations = 0;
        const maxRotations = 12;
        
        const interval = setInterval(() => {
            document.title = `${securityIcons[iconIndex]} ${text} ${securityIcons[iconIndex]}`;
            iconIndex = (iconIndex + 1) % securityIcons.length;
            rotations++;
            
            if (rotations >= maxRotations) {
                clearInterval(interval);
                document.title = `🔒 ${text}`;
                setTimeout(resolve, 1000);
            }
        }, 200);
    });
}

function matrixTitle(text) {
    return new Promise((resolve) => {
        const matrixChars = ['0', '1', '█', '▓', '▒', '░', '▄', '▀'];
        let phase = 0;
        const maxPhases = 8;
        
        const interval = setInterval(() => {
            if (phase % 2 === 0) {
                // Matrix overlay
                let matrix = '';
                for (let i = 0; i < 8; i++) {
                    matrix += matrixChars[Math.floor(Math.random() * matrixChars.length)];
                }
                document.title = `${matrix} ${text} ${matrix}`;
            } else {
                // Clear text
                document.title = `${text}`;
            }
            
            phase++;
            if (phase >= maxPhases) {
                clearInterval(interval);
                document.title = `${text}`;
                setTimeout(resolve, 1500);
            }
        }, 300);
    });
}

function pulsingShieldTitle(text) {
    return new Promise((resolve) => {
        const shields = ['🛡️', '⚔️', '🗡️', '🔰', '🛡️'];
        let pulses = 0;
        const maxPulses = 10;
        
        const interval = setInterval(() => {
            const shield = shields[pulses % shields.length];
            const dots = '.'.repeat((pulses % 4) + 1);
            document.title = `${shield} ${text} ${dots}`;
            
            pulses++;
            if (pulses >= maxPulses) {
                clearInterval(interval);
                document.title = text;
                setTimeout(resolve, 1000);
            }
        }, 400);
    });
}

function lockUnlockTitle(text) {
    return new Promise((resolve) => {
        const sequence = ['🔒', '🔓', '🔒', '🔓', '🔐', '✅'];
        let step = 0;
        
        const interval = setInterval(() => {
            if (step < sequence.length) {
                document.title = `${sequence[step]} ${text} ${sequence[step]}`;
                step++;
            }
            
            if (step >= sequence.length) {
                clearInterval(interval);
                setTimeout(resolve, 1500);
            }
        }, 500);
    });
}

function binaryTitle(text) {
    return new Promise((resolve) => {
        let cycles = 0;
        const maxCycles = 6;
        
        const interval = setInterval(() => {
            if (cycles % 2 === 0) {
                // Binary version
                let binary = '';
                for (let i = 0; i < 12; i++) {
                    binary += Math.random() > 0.5 ? '1' : '0';
                }
                document.title = `${binary} > ${text} < ${binary}`;
            } else {
                // Normal with terminal symbols
                document.title = `⚡ ${text} ⚡`;
            }
            
            cycles++;
            if (cycles >= maxCycles) {
                clearInterval(interval);
                document.title = `💻 ${text}`;
                setTimeout(resolve, 1000);
            }
        }, 400);
    });
}

function stopTitleAnimation() {
    if (titleAnimationInterval) {
        clearInterval(titleAnimationInterval);
    }
    document.title = originalTitle;
}

// Handle visibility change to pause/resume animations
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopTitleAnimation();
        document.title = '🚀 Come back! Missing you... - Avinash Kumar';
    } else {
        document.title = '🎉 Welcome back! - Avinash Kumar';
        // Restart animation after 1 second
        setTimeout(() => {
            document.title = originalTitle;
            startTitleAnimation();
        }, 1000);
    }
});

// Initialize title animation when page loads
window.addEventListener('load', function() {
    startTitleAnimation();
});


