document.addEventListener('DOMContentLoaded', () => {
    const videoPlayer = document.getElementById('lab-video-player');
    const titleHUD = document.getElementById('current-video-title');
    const photoGrid = document.getElementById('photo-gallery-grid');
    const photoStats = document.getElementById('photo-stats');
    
    // Modal elements
    const modal = document.getElementById('photo-modal');
    const modalImg = document.getElementById('modal-img');
    const closeModalBtn = document.querySelector('.modal-close');
    const modalPrev = document.getElementById('modal-prev');
    const modalNext = document.getElementById('modal-next');

    let videoPlaylist = [];
    let photoPlaylist = [];
    let currentVideoIndex = -1;
    let currentPhotoIndexInModal = 0;

    const MAX_ITEMS = 1000;
    const VIDEO_DIR = 'videos/';
    const PHOTO_DIR = 'photos/';

    async function probeFiles() {
        console.log("Loading archive contents...");
        
        // 1. Probe Videos (Sequential)
        videoPlaylist = await findSequentialFiles(VIDEO_DIR, ['mp4', 'mov'], 1, MAX_ITEMS);
        
        if (videoPlaylist.length > 0) {
            playRandomVideo();
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
        const MAX_CONSECUTIVE_FAILS = 5;

        while(p <= max && consecutiveFails < MAX_CONSECUTIVE_FAILS) {
            let foundInStep = false;
            for (let ext of extensions) {
                let url = `${dir}${p}.${ext}`;
                let res = await checkFile(url, p);
                if (res.exists) {
                    found.push({ id: res.id, url: res.url });
                    foundInStep = true;
                    consecutiveFails = 0;
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

    function playRandomVideo() {
        if (videoPlaylist.length === 0) return;
        
        let newIndex = Math.floor(Math.random() * videoPlaylist.length);
        // Try to avoid playing the same video twice in a row if possible
        if (newIndex === currentVideoIndex && videoPlaylist.length > 1) {
            newIndex = (newIndex + 1) % videoPlaylist.length;
        }
        
        currentVideoIndex = newIndex;
        const video = videoPlaylist[currentVideoIndex];
        
        videoPlayer.src = video.url;
        videoPlayer.play().catch(e => console.error("Play error", e));
        titleHUD.textContent = `RANDOM PLAY: FILE #${video.id}`;
    }

    videoPlayer.addEventListener('ended', playRandomVideo);

    function renderGallery() {
        photoGrid.innerHTML = '';
        photoStats.textContent = `Total Items: ${photoPlaylist.length}`;
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
    });

    window.addEventListener('keydown', (e) => { 
        if (modal.style.display === "flex") {
            if (e.key === "Escape") closeModal();
            if (e.key === "ArrowLeft") navigateModal(-1);
            if (e.key === "ArrowRight") navigateModal(1);
        }
    });

    probeFiles();
});
