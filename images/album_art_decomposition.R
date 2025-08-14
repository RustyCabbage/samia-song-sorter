#=============================================
# R Script: Extract Dominant Colors from Album Cover
# This script:
# 1) Reads an image and extracts RGB values
# 2) Applies K-means clustering to find dominant colors
# 3) Reconstructs the image using the clustered colors
# 4) Analyzes colors by size and brightness
#=============================================

# Load required packages
required_pkgs <- c("jpeg", "grDevices", "ggplot2", "reshape2")
for (pkg in required_pkgs) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    install.packages(pkg)
  }
}

library(jpeg)
library(png)
library(ggplot2)
library(reshape2)

#=============================================
# PARAMETERS
#=============================================
image_path      <- paste0("Taylor Swift - The Life of a Showgirl",".jpg")  # Path to album cover image
distance_thresh <- 0.16                 # Euclidean distance threshold for stopping
max_k           <- 10                   # Maximum k to try

#=============================================
# FUNCTIONS
#=============================================

# Function to interpolate between two hex colors
interpolate_hex <- function(hex1, hex2, t) {
  rgb1 <- grDevices::col2rgb(hex1) / 255
  rgb2 <- grDevices::col2rgb(hex2) / 255
  rgb_interp <- (1 - t) * rgb1 + t * rgb2
  grDevices::rgb(rgb_interp[1], rgb_interp[2], rgb_interp[3], maxColorValue = 1)
}

# Vectorized function to calculate relative luminance for a set of colors
calculate_luminance <- function(hex_colors) {
  # Convert hex colors to RGB matrix (3×n matrix)
  rgb_matrix <- grDevices::col2rgb(hex_colors) / 255

  # Apply WCAG gamma correction (vectorized)
  rgb_linear <- ifelse(rgb_matrix <= 0.03928,
                       rgb_matrix / 12.92,
                       ((rgb_matrix + 0.055) / 1.055)^2.4)

  # Calculate luminance (vectorized dot product)
  luminance <- 0.2126 * rgb_linear[1,] + 0.7152 * rgb_linear[2,] + 0.0722 * rgb_linear[3,]

  return(luminance)
}

# Create contrast ratio matrix from hex color codes (vectorized)
create_contrast_matrix <- function(hex_codes) {
  n <- length(hex_codes)

  # Pre-calculate all luminance values
  luminance_values <- calculate_luminance(hex_codes)

  # Create matrices for vectorized calculation
  L1 <- matrix(luminance_values, nrow = n, ncol = n, byrow = TRUE)
  L2 <- matrix(luminance_values, nrow = n, ncol = n, byrow = FALSE)

  # Ensure L1 is always the higher luminance
  L_higher <- pmax(L1, L2)
  L_lower <- pmin(L1, L2)

  # Calculate contrast ratios (vectorized)
  contrast_matrix <- (L_higher + 0.05) / (L_lower + 0.05)

  # Set row and column names
  rownames(contrast_matrix) <- hex_codes
  colnames(contrast_matrix) <- hex_codes

  return(contrast_matrix)
}

# Function to create and plot color legend
plot_color_legend <- function(position, hex_codes, title) {
  legend(
    position,
    legend = hex_codes,
    fill   = hex_codes,
    border = "white",
    cex    = 0.8,
    title  = title,
    box.lwd = 0
  )
}

# Function to create consolidated color data frame
create_color_dataframe <- function(kmeans_result) {
  # Get cluster information
  centroids <- kmeans_result$centers
  cluster_ids <- kmeans_result$cluster
  cluster_sizes <- table(cluster_ids)

  # Convert centroids to hex codes
  hex_codes <- apply(centroids, 1, function(rgb) {
    grDevices::rgb(rgb[1], rgb[2], rgb[3], maxColorValue = 1)
  })

  # Calculate brightness for each color
  brightness_vals <- apply(centroids, 1, function(rgb) {
    0.2126 * rgb[1] + 0.7152 * rgb[2] + 0.0722 * rgb[3]
  })

  # Create data frame
  color_df <- data.frame(
    cluster_id = as.integer(names(cluster_sizes)),
    hex_code = hex_codes[as.integer(names(cluster_sizes))],
    size = as.integer(cluster_sizes),
    brightness = brightness_vals[as.integer(names(cluster_sizes))],
    stringsAsFactors = FALSE
  )

  # Add ordering columns
  color_df$ordered_size <- rank(-color_df$size, ties.method = "first")
  color_df$ordered_brightness <- rank(color_df$brightness, ties.method = "first")

  return(color_df)
}

#=============================================
# MAIN PROCESS
#=============================================

# 1. Read image
if (endsWith(image_path,".png")) {
  img <- readPNG(image_path)
} else {
  img <- readJPEG(image_path)
}
dimensions <- dim(img)
h <- dimensions[1]
w <- dimensions[2]

# 2. Handle different image formats
if (length(dimensions) == 2) {
  # Grayscale image (2D array)
  h <- dimensions[1]
  w <- dimensions[2]

  # Convert grayscale to RGB by replicating the single channel
  px_df <- data.frame(
    R = as.vector(img),
    G = as.vector(img),
    B = as.vector(img)
  )

  cat("Detected 8-bit grayscale image\n")

} else if (length(dimensions) == 3) {
  # Color image (3D array)
  h <- dimensions[1]
  w <- dimensions[2]

  if (dimensions[3] == 1) {
    # Single channel color image (unusual but possible)
    px_df <- data.frame(
      R = as.vector(img[,,1]),
      G = as.vector(img[,,1]),
      B = as.vector(img[,,1])
    )
    cat("Detected single-channel image\n")

  } else if (dimensions[3] >= 3) {
    # Standard RGB or RGBA image
    px_df <- data.frame(
      R = as.vector(img[,,1]),
      G = as.vector(img[,,2]),
      B = as.vector(img[,,3])
    )
    cat("Detected color image with", dimensions[3], "channels\n")

  } else {
    stop("Unexpected image format: ", paste(dimensions, collapse = "x"))
  }
} else {
  stop("Cannot handle image with dimensions: ", paste(dimensions, collapse = "x"))
}

# 3. Iterative K-means clustering
prev_km <- NULL
final_km <- NULL

for (k in 2:max_k) {
  set.seed(123) # For reproducibility
  km <- kmeans(px_df, centers = k)
  centroids <- km$centers  # k x 3 matrix of RGB centroids

  # Compare newest centroid to all others via distance matrix
  dists <- dist(centroids)
  print(dists)
  min_dist <- min(dists)

  if (min_dist < distance_thresh) {
    message(sprintf("Stopping at k = %d (min dist = %.3f < threshold = %.3f)",
                    k, min_dist, distance_thresh))
    final_km <- prev_km
    break
  }

  if (k == max_k) {
    warning("Reached max_k without meeting stopping criteria. Using last model.")
    final_km <- km
    break
  }

  prev_km <- km
}

# 4. Create consolidated color data frame
color_df <- create_color_dataframe(final_km)

# 5. Reconstruct quantized image
pixel_colors <- final_km$centers[final_km$cluster, ]  # matrix (h*w) × 3

quant_img <- array(NA, dim = c(h, w, 3))
quant_img[, , 1] <- matrix(pixel_colors[,1], nrow = h, ncol = w, byrow = FALSE)
quant_img[, , 2] <- matrix(pixel_colors[,2], nrow = h, ncol = w, byrow = FALSE)
quant_img[, , 3] <- matrix(pixel_colors[,3], nrow = h, ncol = w, byrow = FALSE)

#=============================================
# VISUALIZATION
#=============================================

# Function to create color combination grid
create_color_grid <- function(color_df, text = "baby") {

  n_colors <- nrow(color_df)
  hex_codes <- (color_df[order(color_df$ordered_brightness, decreasing = FALSE), ])$hex_code

  # Set up plotting area
  par(mfrow = c(1, 1), mar = c(4, 4, 3, 1))
  plot(0, 0, type = "n", xlim = c(0, n_colors), ylim = c(0, n_colors),
       xlab = "Text Color", ylab = "Background Color",
       main = paste("Color Readability Grid:", text),
       axes = FALSE)

  # Calculate contrast matrix if enhanced mode
  contrast_matrix <- create_contrast_matrix(hex_codes)

  # Create grid
  for (i in 1:n_colors) {
    for (j in 1:n_colors) {
      bg_color <- hex_codes[i]
      text_color <- hex_codes[j]

      # Draw background rectangle
      rect(j-1, n_colors-i, j, n_colors-i+1,
           col = bg_color, border = "white", lwd = 0.5)

      if (i==j) next

      contrast_ratio <- contrast_matrix[i, j]

      text(j-0.5, n_colors-i+0.6, text,
           col = text_color, cex = 0.8, font = 1)
      text(j-0.5, n_colors-i+0.3, sprintf("%.1f", contrast_ratio),
           col = color <- as.character(cut(contrast_ratio,
                              breaks = c(-Inf, 3, 4.5, 7, Inf),
                              labels = c("red", "orange", "yellow", text_color),
                              right = FALSE))
           , cex = 0.8)
    }
  }

  # Add axis labels - draw each label individually with its color
  axis(1, at = seq(0.5, n_colors-0.5), labels = FALSE)
  for (i in 1:n_colors) {
    axis(1, at = i-0.5, labels = hex_codes[i], las = 2, cex.axis = 0.6,
         col.axis = hex_codes[i], tick = FALSE)
  }

  axis(2, at = seq(0.5, n_colors-0.5), labels = FALSE)
  for (i in 1:n_colors) {
    axis(2, at = i-0.5, labels = rev(hex_codes)[i], las = 2, cex.axis = 0.6,
         col.axis = rev(hex_codes)[i], tick = FALSE)
  }
}

#=============================================
# RESULTS SUMMARY
#=============================================

# Display the consolidated color data frame
cat("\nConsolidated Color Analysis:\n")
print(color_df)

# 1. Color clusters by size (largest to smallest)
colors_by_size <- color_df[order(color_df$ordered_size), ]
cat("\nColors ordered by size (largest → smallest):\n")
for (i in 1:nrow(colors_by_size)) {
  cat(sprintf("%d. %s (size: %d pixels)\n",
              i, colors_by_size$hex_code[i], colors_by_size$size[i]))
}

# 2. Color clusters by brightness (darkest to brightest)
colors_by_brightness <- color_df[order(color_df$ordered_brightness), ]
cat("\nColors ordered by brightness (darkest → brightest):\n")
for (i in 1:nrow(colors_by_brightness)) {
  cat(sprintf("%d. %s (brightness: %.3f)\n",
              i, colors_by_brightness$hex_code[i], colors_by_brightness$brightness[i]))
}

create_color_grid(color_df, "baby")

plot(1:2,type="n", xlab="", ylab="", axes=FALSE)
rasterImage(quant_img, 1, 1, 2, 2, interpolate = FALSE)
plot_color_legend("topleft", colors_by_brightness$hex_code, "Colors by brightness")
plot_color_legend("topright", colors_by_size$hex_code, "Colors by size")

# 3. Example color interpolations
cat("\nExample color interpolations:\n")
cat("Baby button color:", interpolate_hex("#1B2525", "#3C4543", 0.5), "\n")
cat("Scout_oj background:", interpolate_hex("#F49862", "#EC8F30", 0.5), "\n")
cat("Scout_oj button:", interpolate_hex("#C57916", "#EC8F30", 0.4), "\n")
cat("Scout button:", interpolate_hex("#C57916", "#EC8F30", 0.7), "\n")
cat("Scout button hover:", interpolate_hex("#C57916", "#EC8F30", 0.3), "\n")
cat("Scout button hover alt:", interpolate_hex("#F6AF9E", "#F49862", 0.25), "\n")
cat("Lover button:", interpolate_hex("#C8C1D9","#83B3D7", 0.5), "\n")
cat("Red button hover:", interpolate_hex("#8B334B","#644D4B", 0.75), "\n")
cat("Speak Now button hover:", interpolate_hex("#763477","#391C3F", 0.5), "\n")
cat("Fearless button hover:", interpolate_hex("#AB864B","#805D32", 0.5), "\n")
#cat("Debut button:", interpolate_hex("#3FAEC5","#BD9270", 0.75), "\n")
#cat("Debut button hover:", interpolate_hex("#3FAEC5","#BD9270", 0.6), "\n")
