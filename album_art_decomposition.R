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
library(ggplot2)
library(reshape2)

#=============================================
# PARAMETERS
#=============================================
image_path      <- "Samia - Scout.jpg"  # Path to album cover image
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
plot_color_legend <- function(position, legend_codes, title) {
  legend(
    position,
    legend = legend_codes,
    fill   = legend_codes,
    border = "white",
    cex    = 0.8,
    title  = title,
    box.lwd = 0
  )
}

#=============================================
# MAIN PROCESS
#=============================================

# 1. Read image
img <- readJPEG(image_path)
dimensions <- dim(img)
h <- dimensions[1]
w <- dimensions[2]

# 2. Convert image to data frame of RGB values
px_df <- data.frame(
  R = as.vector(img[,,1]),
  G = as.vector(img[,,2]),
  B = as.vector(img[,,3])
)

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

# 4. Reconstruct quantized image
pixel_colors <- final_km$centers[final_km$cluster, ]  # matrix (h*w) × 3

quant_img <- array(NA, dim = c(h, w, 3))
quant_img[, , 1] <- matrix(pixel_colors[,1], nrow = h, ncol = w, byrow = FALSE)
quant_img[, , 2] <- matrix(pixel_colors[,2], nrow = h, ncol = w, byrow = FALSE)
quant_img[, , 3] <- matrix(pixel_colors[,3], nrow = h, ncol = w, byrow = FALSE)

# 5. Compute hex codes for each centroid
centroids <- final_km$centers
hex_codes <- apply(centroids, 1, function(rgb) {
  grDevices::rgb(rgb[1], rgb[2], rgb[3], maxColorValue = 1)
})

#=============================================
# COLOR ANALYSIS
#=============================================

# 1. Size-based ordering
cluster_ids   <- final_km$cluster
cluster_sizes <- table(cluster_ids)
ordered_size  <- as.integer(names(sort(cluster_sizes, decreasing = TRUE)))

centroids_size <- final_km$centers[ordered_size, , drop = FALSE]
hex_codes_size <- apply(centroids_size, 1, function(rgb) {
  grDevices::rgb(rgb[1], rgb[2], rgb[3], maxColorValue = 1)
})

# 2. Brightness-based ordering
brightness_vals <- apply(final_km$centers, 1, function(rgb) {
  0.2126 * rgb[1] + 0.7152 * rgb[2] + 0.0722 * rgb[3]
})

ordered_bright   <- order(brightness_vals)
centroids_bright <- final_km$centers[ordered_bright, , drop = FALSE]
hex_codes_bright <- apply(centroids_bright, 1, function(rgb) {
  grDevices::rgb(rgb[1], rgb[2], rgb[3], maxColorValue = 1)
})

#=============================================
# VISUALIZATION
#=============================================

# 1. Plot the quantized image
plot(1:2, type = "n", xlab = "", ylab = "", axes = FALSE)
rasterImage(quant_img, 1, 1, 2, 2, interpolate = FALSE)

# 2. Add color legends
plot_color_legend("topright", hex_codes_size, "Cluster Colors (size)")
plot_color_legend("topleft", hex_codes_bright, "Cluster Colors (brightness)")

# 3. Generate contrast matrix
contrast_matrix <- create_contrast_matrix(hex_codes_bright)

# 4. Visualize contrast matrix
df <- melt(contrast_matrix, varnames = c("hex1", "hex2"), value.name = "contrast")

p <- ggplot(df, aes(x = hex1, y = hex2, fill = contrast)) +
  geom_tile() +
  geom_text(aes(label = round(contrast, 1)), color = "black", size = 3) +
  scale_fill_steps(
    name = "Contrast Ratio",
    breaks = c(1.2, 3, 4.5, 7),
    low = "white",
    high = "steelblue"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    axis.text.x = element_text(
      angle = 45,
      hjust = 1,
      colour = setNames(as.character(unique(df$hex1)), unique(df$hex1))[levels(df$hex1)]
    ),
    axis.text.y = element_text(
      colour = setNames(as.character(unique(df$hex2)), unique(df$hex2))[levels(df$hex2)]
    ),
    panel.grid = element_blank()
  ) +
  labs(x = NULL, y = NULL)

print(p)

#=============================================
# RESULTS SUMMARY
#=============================================

# 1. Color clusters by size (largest to smallest)
sizes_sorted <- cluster_sizes[as.character(ordered_size)]
names(sizes_sorted) <- hex_codes_size

cat("\nCluster sizes (largest → smallest), labeled by hex:\n")
print(sizes_sorted)

# 2. Color clusters by brightness (darkest to brightest)
bright_sorted <- brightness_vals[ordered_bright]
names(bright_sorted) <- hex_codes_bright

cat("\nBrightness (darkest → brightest), labeled by hex:\n")
print(bright_sorted)

# 3. Example color interpolations
cat("\nExample color interpolations:\n")
cat("Baby button color:", interpolate_hex("#1B2525", "#3C4543", 0.5), "\n")
cat("Scout_oj background:", interpolate_hex("#F49862", "#EC8F30", 0.5), "\n")
cat("Scout_oj button:", interpolate_hex("#C57916", "#EC8F30", 0.4), "\n")
cat("Scout button:", interpolate_hex("#C57916", "#EC8F30", 0.7), "\n")
cat("Scout button hover:", interpolate_hex("#C57916", "#EC8F30", 0.3), "\n")
cat("Scout button hover alt:", interpolate_hex("#F6AF9E", "#F49862", 0.25), "\n")
