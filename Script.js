// Configuración del worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const bookContainer = document.getElementById('flip-book');
const loading = document.getElementById('loading');
const pageSound = document.getElementById('page-sound');

const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const speechBtn = document.getElementById('speech-btn');
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');

let pageFlip = null;
let pdfDoc = null;
let currentZoomScale = 1.5; // Escala inicial

// Cargar automáticamente el archivo "cuento.pdf" alojado en el repositorio
window.addEventListener('DOMContentLoaded', () => {
    loadPDFFromRepo('cuento.pdf');
});

async function loadPDFFromRepo(url) {
    try {
        const loadingTask = pdfjsLib.getDocument(url);
        pdfDoc = await loadingTask.promise;
        renderBook(pdfDoc, currentZoomScale);
    } catch (error) {
        console.error('Error al cargar el PDF:', error);
        loading.innerText = 'No se pudo cargar "cuento.pdf". Asegúrate de que el archivo esté en el repositorio.';
    }
}

async function renderBook(pdf, scale) {
    loading.style.display = 'block';
    bookContainer.style.display = 'none';
    bookContainer.innerHTML = '';

    if (pageFlip) {
        pageFlip.destroy();
        pageFlip = null;
    }

    const totalPages = pdf.numPages;
    let pageWidth = 400;
    let pageHeight = 600;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale });
        
        if (pageNum === 1) {
            pageWidth = viewport.width;
            pageHeight = viewport.height;
        }

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        await page.render(renderContext).promise;

        const pageDiv = document.createElement('div');
        pageDiv.className = 'page';
        pageDiv.appendChild(canvas);
        bookContainer.appendChild(pageDiv);
    }

    bookContainer.style.display = 'block';

    pageFlip = new St.PageFlip(bookContainer, {
        width: pageWidth,
        height: pageHeight,
        size: "stretch",
        minWidth: 300,
        maxWidth: pageWidth,
        minHeight: 400,
        maxHeight: pageHeight,
        showCover: true,
        maxShadowOpacity: 0.6,
        usePortrait: true
    });

    const pages = document.querySelectorAll('.page');
    pageFlip.loadFromHTML(pages);

    loading.style.display = 'none';

    // Evento de sonido al pasar página
    pageFlip.on('flip', (e) => {
        try {
            pageSound.currentTime = 0;
            pageSound.play().catch(err => console.log("Audio prevenido por el navegador", err));
        } catch (e) {
            console.error(e);
        }
    });
}

// Botones de navegación externos
prevBtn.addEventListener('click', () => {
    if (pageFlip) pageFlip.flipPrev();
});

nextBtn.addEventListener('click', () => {
    if (pageFlip) pageFlip.flipNext();
});

// Controles de Zoom para alumnos con baja visión
zoomInBtn.addEventListener('click', () => {
    if (currentZoomScale < 2.2) {
        currentZoomScale += 0.25;
        if (pdfDoc) renderBook(pdfDoc, currentZoomScale);
    }
});

zoomOutBtn.addEventListener('click', () => {
    if (currentZoomScale > 1.0) {
        currentZoomScale -= 0.25;
        if (pdfDoc) renderBook(pdfDoc, currentZoomScale);
    }
});

// Lectura en voz alta usando la Web Speech API del navegador
speechBtn.addEventListener('click', async () => {
    if (!pdfDoc) return;
    
    // Obtener la página actual visible
    const currentPageIndex = pageFlip ? pageFlip.getCurrentPageIndex() + 1 : 1;
    
    try {
        const page = await pdfDoc.getPage(currentPageIndex);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map(item => item.str);
        const fullText = textItems.join(' ');

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Detener lectura previa si la hay
            if (fullText.trim() === "") {
                speakText("Esta página no contiene texto legible por voz.");
                return;
            }
            speakText(fullText);
        } else {
            alert("Tu navegador no soporta la función de lectura en voz alta.");
        }
    } catch (error) {
        console.error("Error al extraer texto para lectura:", error);
    }
});

function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 0.9; // Velocidad amigable para niños / baja visión
    window.speechSynthesis.speak(utterance);
}