document.addEventListener('DOMContentLoaded', () => {
    const videoPlayer = document.getElementById('lab-video-player');
    const playlistContainer = document.getElementById('playlist-container');
    const titleHUD = document.getElementById('current-video-title');
    const photoGrid = document.getElementById('photo-gallery-grid');
    const photoStats = document.getElementById('photo-stats');
    
    // Toggle Menu elements
    const toggleBtn = document.getElementById('toggle-playlist');
    const playlistPanel = document.getElementById('compact-playlist-panel');

    // Modal elements
    const modal = document.getElementById('photo-modal');
    const modalImg = document.getElementById('modal-img');
    const closeModalBtn = document.querySelector('.modal-close');
    const modalPrev = document.getElementById('modal-prev');
    const modalNext = document.getElementById('modal-next');

    let videoPlaylist = [];
    let photoPlaylist = [];
    let currentVideoIndex = 0;
    let currentPhotoIndexInModal = 0;

    const MAX_ITEMS = 1000;
    const VIDEO_DIR = 'videos/';
    const PHOTO_DIR = 'photos/';

    // Toggle Playlist Menu
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            playlistPanel.classList.toggle('hidden');
        });
    }

    async function probeFiles() {
        console.log("Loading archive contents...");
        
        // 1. Probe Videos (Sequential)
        playlistContainer.innerHTML = '<div class="loading-feed">SCANNING...</div>';
        videoPlaylist = await findSequentialFiles(VIDEO_DIR, ['mp4', 'mov'], 1, MAX_ITEMS);
        
        if (videoPlaylist.length === 0) {
            playlistContainer.innerHTML = '<div class="loading-feed" style="color:var(--neon-red)">EMPTY</div>';
        } else {
            renderPlaylist();
            if (!videoPlayer.src || videoPlayer.src === "") {
                playVideo(0);
            }
        }

        // 2. Probe Photos (Sequential)
        photoGrid.innerHTML = '<div class="loading-feed" style="grid-column: 1/-1; padding: 40px;">SCANNING...</div>';
        photoPlaylist = await findSequentialFiles(PHOTO_DIR, ['jpg', 'jpeg', 'png'], 1, MAX_ITEMS);
        
        if (photoPlaylist.length === 0) {
            photoGrid.innerHTML = '<div class="loading-feed" style="color:var(--neon-blue); grid-column:1/-1; padding:40px;">EMPTY</div>';
        } else {
            renderGallery();
        }
    }

    async function findSequentialFiles(dir, extensions, start, max) {
        let found = [];
        let p = start;
        let consecutiveFails = 0;
        const MAX_CONSECUTIVE_FAILS = 5; // Allow some gaps in naming

        while(p <= max && consecutiveFails < MAX_CONSECUTIVE_FAILS) {
            let foundInStep = false;
            for (let ext of extensions) {
                let url = `${dir}${p}.${ext}`;
                let res = await checkFile(url, p);
                if (res.exists) {
                    found.push({ id: res.id, url: res.url });
                    foundInStep = true;
                    consecutiveFails = 0; // Reset on success
                    break;
                }
            }
            if (!foundInStep) consecutiveFails++;
            p++;
        }
        return found;
    }

    async function checkFile(url, id) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
                return { exists: true, url, id };
            }
        } catch (e) {}
        return { exists: false };
    }

    function renderPlaylist() {
        playlistContainer.innerHTML = '';
        videoPlaylist.forEach((video, index) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.dataset.index = index;
            item.innerHTML = `FILE #${video.id}`;
            item.addEventListener('click', () => {
                playVideo(index);
                playlistPanel.classList.add('hidden'); // Close menu on select
            });
            playlistContainer.appendChild(item);
        });
    }

    function playVideo(index) {
        if (index < 0 || index >= videoPlaylist.length) return;
        currentVideoIndex = index;
        const video = videoPlaylist[index];
        document.querySelectorAll('.playlist-item').forEach(el => el.classList.remove('active'));
        const activeItem = document.querySelector(`.playlist-item[data-index="${index}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
        videoPlayer.src = video.url;
        videoPlayer.play().catch(e => console.error("Play error", e));
        titleHUD.textContent = `FILE: ${video.id}.MP4`;
    }

    videoPlayer.addEventListener('ended', () => {
        let nextIndex = currentVideoIndex + 1;
        if (nextIndex < videoPlaylist.length) playVideo(nextIndex);
        else playVideo(0);
    });

    function renderGallery() {
        photoGrid.innerHTML = '';
        photoStats.textContent = `Total: ${photoPlaylist.length}`;
        photoPlaylist.forEach((photo, index) => {
            const item = document.createElement('div');
            item.className = 'lab-photo-item';
            item.innerHTML = `<img src="${photo.url}" alt="Photo ${photo.id}" loading="lazy">`;
            item.addEventListener('click', () => openModal(index));
            photoGrid.appendChild(item);
        });
    }

    function openModal(index) {
        if (index < 0 || index >= photoPlaylist.length) return;
        currentPhotoIndexInModal = index;
        modal.style.display = "flex";
        updateModalContent(photoPlaylist[index]);
    }

    function updateModalContent(photo) {
        modalImg.src = photo.url;
    }

    function navigateModal(step) {
        let newIndex = currentPhotoIndexInModal + step;
        if (newIndex >= 0 && newIndex < photoPlaylist.length) {
            currentPhotoIndexInModal = newIndex;
            updateModalContent(photoPlaylist[newIndex]);
        }
    }

    function closeModal() {
        modal.style.display = "none";
        modalImg.src = "";
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalPrev) modalPrev.addEventListener('click', (e) => { e.stopPropagation(); navigateModal(-1); });
    if (modalNext) modalNext.addEventListener('click', (e) => { e.stopPropagation(); navigateModal(1); });
    
    window.addEventListener('click', (e) => { 
        if (e.target === modal) closeModal(); 
        // Close playlist if clicked outside
        if (playlistPanel && !playlistPanel.contains(e.target) && e.target !== toggleBtn) {
            playlistPanel.classList.add('hidden');
        }
    });

    window.addEventListener('keydown', (e) => { 
        if (modal.style.display === "flex") {
            if (e.key === "Escape") closeModal();
            if (e.key === "ArrowLeft") navigateModal(-1);
            if (e.key === "ArrowRight") navigateModal(1);
        }
    });

    probeFiles();
    // Removed setInterval(probeFiles, 120000); // User requested to remove auto-refresh
});
