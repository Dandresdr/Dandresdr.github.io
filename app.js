class GPSPhotoHack {
    constructor() {
        this.initElements();
        this.initEventListeners();
        this.initMap();
    }

    initElements() {
        this.imageUpload = document.getElementById('imageUpload');
        this.addressInput = document.getElementById('addressInput');
        this.dateTimeInput = document.getElementById('dateTimeInput');
        this.previewCanvas = document.getElementById('previewCanvas');
        this.generateWatermarkBtn = document.getElementById('generateWatermarkBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.mapContainer = document.getElementById('mapContainer');
        this.watermarkFont = document.getElementById('watermarkFont');
        this.watermarkFontSize = document.getElementById('watermarkFontSize');
        
        // Store the selected marker to remove/update later
        this.selectedMarker = null;
        
        this.cameraInput = document.getElementById('cameraInput');
        this.cameraPreview = document.getElementById('cameraPreview');
        this.cameraCaptureCanvas = document.getElementById('cameraCaptureCanvas');
    }

    initEventListeners() {
        this.imageUpload.addEventListener('change', this.handleImageUpload.bind(this));
        this.generateWatermarkBtn.addEventListener('click', this.generateWatermark.bind(this));
        this.downloadBtn.addEventListener('click', this.downloadImage.bind(this));
        
        // Add listeners for manual input updates
        this.addressInput.addEventListener('change', () => {
            if (this.generateWatermarkBtn.style.display !== 'inline-block' && this.originalImage) {
                this.generateWatermarkBtn.style.display = 'inline-block';
            }
        });
        
        this.dateTimeInput.addEventListener('change', () => {
            if (this.generateWatermarkBtn.style.display !== 'inline-block' && this.originalImage) {
                this.generateWatermarkBtn.style.display = 'inline-block';
            }
        });

        this.watermarkFont.addEventListener('change', () => {
            if (this.originalImage) {
                this.generateWatermarkBtn.style.display = 'inline-block';
            }
        });
        
        this.watermarkFontSize.addEventListener('change', () => {
            if (this.originalImage) {
                this.generateWatermarkBtn.style.display = 'inline-block';
            }
        });
        
        this.cameraInput.addEventListener('click', this.initializeCamera.bind(this));
    }

    initMap() {
        // Default to a central location if geolocation fails
        const defaultLat = 40.4168;
        const defaultLon = -3.7038; // Madrid coordinates

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                this.initializeMap(position.coords.latitude, position.coords.longitude);
            }, (error) => {
                console.warn(`Geolocation error: ${error.message}`);
                this.initializeMap(defaultLat, defaultLon);
            });
        } else {
            this.initializeMap(defaultLat, defaultLon);
        }
    }

    initializeMap(lat, lon) {
        // Remove any existing map
        if (this.map) {
            this.map.remove();
        }

        // Create new map
        this.map = L.map(this.mapContainer).setView([lat, lon], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            opacity: 0.7
        }).addTo(this.map);

        // Add click event to the map
        this.map.on('click', this.handleMapClick.bind(this));

        // Initial marker if no address is set
        if (!this.addressInput.value.trim()) {
            this.addMarker(lat, lon);
        }
    }

    handleMapClick(e) {
        const { lat, lng } = e.latlng;
        
        // Remove previous marker if exists
        if (this.selectedMarker) {
            this.map.removeLayer(this.selectedMarker);
        }

        // Add new marker
        this.selectedMarker = L.marker([lat, lng], {
            opacity: 0.7
        }).addTo(this.map);

        // Reverse geocode to get address
        this.reverseGeocode(lat, lng);
    }

    async reverseGeocode(lat, lon) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await response.json();
            this.addressInput.value = data.display_name;

            // Enable generate watermark if image is loaded
            if (this.originalImage) {
                this.generateWatermarkBtn.style.display = 'inline-block';
            }
        } catch (error) {
            console.error("Error obteniendo dirección:", error);
            // Fallback to coordinates if reverse geocoding fails
            this.addressInput.value = `Coordenadas: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        }
    }

    addMarker(lat, lon) {
        if (this.selectedMarker) {
            this.map.removeLayer(this.selectedMarker);
        }
        
        this.selectedMarker = L.marker([lat, lon], {
            opacity: 0.7
        }).addTo(this.map);
    }

    async initializeCamera() {
        try {
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment' // Prefer back/environment camera
                } 
            });

            // Show video preview
            this.cameraPreview.srcObject = stream;
            this.cameraPreview.style.display = 'block';
            this.cameraPreview.play();

            // Create capture button
            const captureBtn = document.createElement('button');
            captureBtn.textContent = 'Capturar Foto';
            captureBtn.classList.add('upload-btn');
            captureBtn.addEventListener('click', this.capturePhoto.bind(this));
            this.cameraInput.parentNode.insertBefore(captureBtn, this.cameraInput.nextSibling);
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('No se pudo acceder a la cámara. Asegúrate de dar permisos.');
        }
    }

    capturePhoto() {
        // Capture photo from video stream
        const ctx = this.cameraCaptureCanvas.getContext('2d');
        this.cameraCaptureCanvas.width = this.cameraPreview.videoWidth;
        this.cameraCaptureCanvas.height = this.cameraPreview.videoHeight;
        
        ctx.drawImage(this.cameraPreview, 0, 0);

        // Convert canvas to blob and process like file upload
        this.cameraCaptureCanvas.toBlob((blob) => {
            // Create a file-like object
            const file = new File([blob], 'captured_photo.jpg', { type: 'image/jpeg' });
            
            // Simulate file upload
            this.processImageFile(file);

            // Hide camera preview
            this.cameraPreview.style.display = 'none';
            
            // Stop camera stream
            const tracks = this.cameraPreview.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }, 'image/jpeg');
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        this.processImageFile(file);
    }

    processImageFile(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            this.originalImage = new Image();
            this.originalImage.onload = () => {
                this.previewCanvas.width = this.originalImage.width;
                this.previewCanvas.height = this.originalImage.height;
                const ctx = this.previewCanvas.getContext('2d');
                ctx.drawImage(this.originalImage, 0, 0);
                
                // Only show generate watermark if we have an address
                if (this.addressInput.value.trim()) {
                    this.generateWatermarkBtn.style.display = 'inline-block';
                }
            }
            this.originalImage.src = e.target.result;
        }
        reader.readAsDataURL(file);
    }

    async generateWatermark() {
        if (!this.originalImage) return;

        const ctx = this.previewCanvas.getContext('2d');
        ctx.drawImage(this.originalImage, 0, 0);

        // Capture map screenshot
        try {
            const mapScreenshot = await this.captureMapScreenshot();

            // Draw map screenshot as a watermark
            if (mapScreenshot) {
                // Increase map watermark size to 20% of image size
                const mapWatermarkSize = Math.min(this.previewCanvas.width, this.previewCanvas.height) * 0.2;
                
                // Position the map in the bottom-right corner with slight overlap
                ctx.globalAlpha = 0.7; // Make map translucent
                ctx.drawImage(
                    mapScreenshot, 
                    this.previewCanvas.width - mapWatermarkSize, 
                    this.previewCanvas.height - mapWatermarkSize, 
                    mapWatermarkSize, 
                    mapWatermarkSize
                );
                ctx.globalAlpha = 1; // Reset transparency
            }
        } catch (error) {
            console.error('Error capturing map screenshot:', error);
        }

        // Watermark styling for text
        const fontSize = parseInt(this.watermarkFontSize.value);
        ctx.font = `${fontSize}px ${this.watermarkFont.value}`;

        // Get date and time (manual or current)
        const dateTime = this.dateTimeInput.value 
            ? new Date(this.dateTimeInput.value) 
            : new Date();
        
        const formattedDate = dateTime.toLocaleDateString();
        const formattedTime = dateTime.toLocaleTimeString();
        const address = this.addressInput.value || 'Ubicación no especificada';

        // Get coordinates (use selected marker's coordinates)
        let coordinates = 'Coordenadas no disponibles';
        if (this.selectedMarker) {
            const latlng = this.selectedMarker.getLatLng();
            coordinates = `Lat: ${latlng.lat.toFixed(4)}, Lon: ${latlng.lng.toFixed(4)}`;
        }

        // Text positioning
        const lineHeight = fontSize + 10;
        const padding = 10;
        const textX = 20;
        const textY = this.previewCanvas.height - 4 * lineHeight; // Adjusted for new line

        // Measure text width for background
        ctx.font = `${fontSize}px ${this.watermarkFont.value}`;
        const dateWidth = ctx.measureText(`Fecha: ${formattedDate}`).width;
        const timeWidth = ctx.measureText(`Hora: ${formattedTime}`).width;
        const addressWidth = ctx.measureText(`Dirección: ${address}`).width;
        const coordsWidth = ctx.measureText(`Coordenadas: ${coordinates}`).width;
        const maxWidth = Math.max(dateWidth, timeWidth, addressWidth, coordsWidth) + 2 * padding;

        // Draw translucent black background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(
            textX - padding, 
            textY - lineHeight, 
            maxWidth, 
            4 * lineHeight + 2 * padding // Adjusted for new line
        );

        // Draw text in white
        ctx.fillStyle = 'white';
        ctx.fillText(`Fecha: ${formattedDate}`, textX, textY);
        ctx.fillText(`Hora: ${formattedTime}`, textX, textY + lineHeight);
        ctx.fillText(`Dirección: ${address}`, textX, textY + 2 * lineHeight);
        ctx.fillText(`Coordenadas: ${coordinates}`, textX, textY + 3 * lineHeight); // New line for coordinates

        this.downloadBtn.style.display = 'inline-block';
    }

    captureMapScreenshot() {
        return new Promise((resolve, reject) => {
            // Use html2canvas to capture map screenshot
            html2canvas(this.mapContainer, {
                useCORS: true,
                logging: false,
                scale: 1
            }).then(canvas => {
                resolve(canvas);
            }).catch(error => {
                console.error('Error in map screenshot:', error);
                reject(error);
            });
        });
    }

    downloadImage() {
        const link = document.createElement('a');
        link.download = 'gps_photo_watermark.png';
        link.href = this.previewCanvas.toDataURL();
        link.click();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new GPSPhotoHack();
});

export default GPSPhotoHack;