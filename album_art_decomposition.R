#=============================================
# R Script: Extract Dominant Colors from Album Cover
# 1) Read image and extract RGB values
# 2) Iteratively apply K-means clustering (k = 2, 3, ...) until stopping criteria
# 3) Regenerate the image replacing each pixel with its k-means color
#=============================================

# Install required packages if not already installed
required_pkgs <- c("jpeg", "grDevices")
for (pkg in required_pkgs) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    install.packages(pkg)
  }
}

library(jpeg)

# ---- Parameters ----
image_path    <- "Samia - Scout.jpg"    # Path to your album cover image
distance_thresh <- 0.16                           # Euclidean distance threshold for stopping
max_k          <- 10                            # Maximum k to try (safeguard)

# ---- Read image ----
img <- readJPEG(image_path)
# img is an array [height, width, 3]

# ---- Vectorized reshape to data frame of RGB ----
dimensions <- dim(img)
h <- dimensions[1]; w <- dimensions[2]
px_df <- data.frame(
  R = as.vector(img[,,1]),
  G = as.vector(img[,,2]),
  B = as.vector(img[,,3])
)

# ---- Iterative K-means ----
prev_km <- NULL
for (k in 2:max_k) {
  set.seed(123)
  km <- kmeans(px_df, centers = k)
  centroids <- km$centers  # k x 3 matrix of RGB centroids

  # Compare newest centroid to all others via a full distance matrix
  dists <- dist(centroids)
  print(dists)
  min_dist <- min(dists)

  if (min_dist < distance_thresh) {
    message(sprintf("Stopping at k = %d (min dist = %.3f < threshold = %.3f)", k, min_dist, distance_thresh))
    km <- prev_km
    final_km <- km
    break
  }

  if (k == max_k) {
    warning("Reached max_k without meeting stopping criteria. Using last model.")
    final_km <- km
    break
  }

  prev_km <- km
}

# ---- Step 3: Reconstruct and Plot Quantized Image ----

# 1. Extract the centroid colors for each pixel
#    final_km$cluster is a vector of length (h*w) giving the cluster ID of each pixel
#    final_km$centers is a k×3 matrix of RGB values (in [0,1])
pixel_colors <- final_km$centers[ final_km$cluster, ]  # matrix (h*w) × 3

# 2. Reshape into an array [h, w, 3]
quant_img <- array(NA, dim = c(h, w, 3))
quant_img[ , , 1] <- matrix(pixel_colors[,1], nrow = h, ncol = w, byrow = FALSE)
quant_img[ , , 2] <- matrix(pixel_colors[,2], nrow = h, ncol = w, byrow = FALSE)
quant_img[ , , 3] <- matrix(pixel_colors[,3], nrow = h, ncol = w, byrow = FALSE)

# ---- After reconstructing `quant_img` and plotting it ----

# Compute hex codes for each centroid
centroids <- final_km$centers
hex_codes <- apply(centroids, 1, function(rgb) {
  grDevices::rgb(rgb[1], rgb[2], rgb[3], maxColorValue = 1)
})

# Plot the quantized image
plot(1:2, type = "n", xlab = "", ylab = "", axes = FALSE)
rasterImage(quant_img, 1, 1, 2, 2, interpolate = FALSE)

# ---- Size‐based ordering ----

# 1. Get cluster sizes
cluster_ids      <- final_km$cluster
cluster_sizes    <- table(cluster_ids)

# 2. Order cluster indices by decreasing size
ordered_size     <- as.integer(names(sort(cluster_sizes, decreasing = TRUE)))

# 3. Reorder centroids and generate hex codes
centroids_size   <- final_km$centers[ordered_size, , drop = FALSE]
hex_codes_size   <- apply(centroids_size, 1, function(rgb) {
  grDevices::rgb(rgb[1], rgb[2], rgb[3], maxColorValue = 1)
})

# Now you have:
# - cluster_sizes             : table of counts per cluster
# - ordered_size              : integer vector of cluster IDs sorted by size
# - centroids_size            : matrix of RGB centroids in size order
# - hex_codes_size            : hex strings in size order


# ---- Brightness‐based ordering ----

# 1. Compute brightness (luminance) for each original centroid
# https://stackoverflow.com/questions/596216/formula-to-determine-perceived-brightness-of-rgb-color
brightness_vals   <- apply(final_km$centers, 1, function(rgb) {
  0.2126 * rgb[1] + 0.7152 * rgb[2] + 0.0722 * rgb[3]
})

# 2. Order cluster indices by increasing brightness
ordered_bright   <- order(brightness_vals)

# 3. Reorder centroids and generate hex codes
centroids_bright <- final_km$centers[ordered_bright, , drop = FALSE]
hex_codes_bright <- apply(centroids_bright, 1, function(rgb) {
  grDevices::rgb(rgb[1], rgb[2], rgb[3], maxColorValue = 1)
})

# Now you have:
# - brightness_vals            : numeric vector of luminance per cluster
# - ordered_bright             : integer vector of cluster IDs sorted by brightness
# - centroids_bright           : matrix of RGB centroids in brightness order
# - hex_codes_bright           : hex strings in brightness order

# ---- Plot image ----
plot(1:2, type = "n", xlab = "", ylab = "", axes = FALSE)
rasterImage(quant_img, 1, 1, 2, 2, interpolate = FALSE)

# ---- Add ordered legend (boxes) ----
legend(
  "topright",
  legend = hex_codes_size,
  fill   = hex_codes_size,
  border = "white",
  cex    = 0.8,
  title  = "Cluster Colors (size)",
  box.lwd = 0                 # remove legend box border
)

# ---- Add ordered legend (boxes) ----
legend(
  "topleft",
  legend = hex_codes_bright,
  fill   = hex_codes_bright,
  border = "white",
  cex    = 0.8,
  title  = "Cluster Colors (brightness)",
  box.lwd = 0                 # remove legend box border
)

# would be better to interpolate CIELAB I think? idk if it's invariant. but anyway i lazy
interpolate_hex <- function(hex1, hex2, t) {
  rgb1 <- grDevices::col2rgb(hex1) / 255
  rgb2 <- grDevices::col2rgb(hex2) / 255
  rgb_interp <- (1 - t) * rgb1 + t * rgb2
  grDevices::rgb(rgb_interp[1], rgb_interp[2], rgb_interp[3], maxColorValue = 1)
}

# ---- Print summaries ----

# 1. Sizes → largest to smallest
sizes_sorted <- cluster_sizes[ as.character(ordered_size) ]
names(sizes_sorted) <- hex_codes_size

# 2. Brightness → darkest to brightest
bright_sorted <- brightness_vals[ ordered_bright ]
names(bright_sorted) <- hex_codes_bright

# ---- Print them ----
cat("Cluster sizes (largest → smallest), labeled by hex:\n")
print(sizes_sorted)

cat("\nBrightness (darkest → brightest), labeled by hex:\n")
print(bright_sorted)

# Example usage
interpolate_hex("#1B2525", "#3C4543", 0.5) # The Baby button color
interpolate_hex("#F49862", "#EC8F30", 0.5) # Scout_oj background color
interpolate_hex("#C57916", "#EC8F30", 0.4) # Scout_oj button color
interpolate_hex("#C57916", "#EC8F30", 0.7) # Scout button color
interpolate_hex("#C57916", "#EC8F30", 0.3) # Scout button hover color
