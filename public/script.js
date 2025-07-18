const form = document.getElementById('uploadForm');
const imageFile = document.getElementById('imageFile');
const categorySelect = document.getElementById('categorySelect');
const gallery = document.getElementById('gallery');
const filterCategory = document.getElementById('filterCategory');

const lightbox = document.getElementById('lightbox');
lightbox.addEventListener('click', () => lightbox.style.display = 'none');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = imageFile.files[0];
  const category = categorySelect.value;
  if (!file || !category) return;

  const storageRef = storage.ref(`photos/${Date.now()}_${file.name}`);
  await storageRef.put(file);
  const url = await storageRef.getDownloadURL();

  await db.collection('photos').add({
    url,
    category,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  form.reset();
  loadGallery();
});

filterCategory.addEventListener('change', loadGallery);

async function loadGallery() {
  const selected = filterCategory.value;
  gallery.innerHTML = '';
  let query = db.collection('photos').orderBy('createdAt', 'desc');
  if (selected !== '全部') {
    query = query.where('category', '==', selected);
  }
  const snapshot = await query.get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const img = document.createElement('img');
    img.src = data.url;
    img.addEventListener('click', () => {
      lightbox.innerHTML = '';
      const lbImg = document.createElement('img');
      lbImg.src = data.url;
      lightbox.appendChild(lbImg);
      lightbox.style.display = 'flex';
    });
    gallery.appendChild(img);
  });
}

loadGallery();