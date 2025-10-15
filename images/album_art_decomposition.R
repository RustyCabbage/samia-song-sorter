# Function to interpolate between two hex colors
interpolate_hex <- function(hex1, hex2, t) {
  rgb1 <- grDevices::col2rgb(hex1) / 255
  rgb2 <- grDevices::col2rgb(hex2) / 255
  rgb_interp <- (1 - t) * rgb1 + t * rgb2
  grDevices::rgb(rgb_interp[1], rgb_interp[2], rgb_interp[3], maxColorValue = 1)
}

analyze_album_colors <- function(image_path,
                                 distance_thresh = 0.16,
                                 max_k = 10,
                                 plot_grid = TRUE,
                                 plot_reconstruction = TRUE,
                                 grid_text = "baby") {

  # Load required packages
  required_pkgs <- c("jpeg", "png", "grDevices")
  for (pkg in required_pkgs) {
    if (!requireNamespace(pkg, quietly = TRUE)) {
      install.packages(pkg)
    }
  }

  library(jpeg)
  library(png)

  # Helper: Calculate relative luminance
  calculate_luminance <- function(hex_colors) {
    rgb_matrix <- grDevices::col2rgb(hex_colors) / 255
    rgb_linear <- ifelse(rgb_matrix <= 0.03928,
                         rgb_matrix / 12.92,
                         ((rgb_matrix + 0.055) / 1.055)^2.4)
    0.2126 * rgb_linear[1,] + 0.7152 * rgb_linear[2,] + 0.0722 * rgb_linear[3,]
  }

  # Helper: Create contrast matrix
  create_contrast_matrix <- function(hex_codes) {
    n <- length(hex_codes)
    luminance_values <- calculate_luminance(hex_codes)
    L1 <- matrix(luminance_values, nrow = n, ncol = n, byrow = TRUE)
    L2 <- matrix(luminance_values, nrow = n, ncol = n, byrow = FALSE)
    L_higher <- pmax(L1, L2)
    L_lower <- pmin(L1, L2)
    contrast_matrix <- (L_higher + 0.05) / (L_lower + 0.05)
    rownames(contrast_matrix) <- hex_codes
    colnames(contrast_matrix) <- hex_codes
    contrast_matrix
  }

  # Helper: Plot color grid
  plot_color_grid <- function(color_df, text) {
    n_colors <- nrow(color_df)
    hex_codes <- (color_df[order(color_df$ordered_brightness), ])$hex_code

    par(mfrow = c(1, 1), mar = c(4, 4, 3, 1))
    plot(0, 0, type = "n", xlim = c(0, n_colors), ylim = c(0, n_colors),
         xlab = "Text Color", ylab = "Background Color",
         main = paste("Color Readability Grid:", text), axes = FALSE)

    contrast_matrix <- create_contrast_matrix(hex_codes)

    for (i in 1:n_colors) {
      for (j in 1:n_colors) {
        bg_color <- hex_codes[i]
        text_color <- hex_codes[j]

        rect(j-1, n_colors-i, j, n_colors-i+1,
             col = bg_color, border = "white", lwd = 0.5)

        if (i == j) next

        contrast_ratio <- contrast_matrix[i, j]
        text(j-0.5, n_colors-i+0.6, text, col = text_color, cex = 0.8, font = 1)
        text(j-0.5, n_colors-i+0.3, sprintf("%.1f", contrast_ratio),
             col = as.character(cut(contrast_ratio,
                                    breaks = c(-Inf, 3, 4.5, 7, Inf),
                                    labels = c("red", "orange", "yellow", text_color),
                                    right = FALSE)),
             cex = 0.8)
      }
    }

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

  # Read image
  if (endsWith(image_path, ".png")) {
    img <- readPNG(image_path)
  } else {
    img <- readJPEG(image_path)
  }

  dimensions <- dim(img)

  # Handle different image formats
  if (length(dimensions) == 2) {
    h <- dimensions[1]
    w <- dimensions[2]
    px_df <- data.frame(R = as.vector(img), G = as.vector(img), B = as.vector(img))
    cat("Detected 8-bit grayscale image\n")
  } else if (length(dimensions) == 3) {
    h <- dimensions[1]
    w <- dimensions[2]
    if (dimensions[3] == 1) {
      px_df <- data.frame(R = as.vector(img[,,1]), G = as.vector(img[,,1]),
                          B = as.vector(img[,,1]))
      cat("Detected single-channel image\n")
    } else if (dimensions[3] >= 3) {
      px_df <- data.frame(R = as.vector(img[,,1]), G = as.vector(img[,,2]),
                          B = as.vector(img[,,3]))
      cat("Detected color image with", dimensions[3], "channels\n")
    } else {
      stop("Unexpected image format: ", paste(dimensions, collapse = "x"))
    }
  } else {
    stop("Cannot handle image with dimensions: ", paste(dimensions, collapse = "x"))
  }

  # Calculate image-wide averages
  avg_rgb <- colMeans(px_df)
  avg_brightness <- 0.2126 * avg_rgb[1] + 0.7152 * avg_rgb[2] + 0.0722 * avg_rgb[3]

  # Iterative K-means clustering
  prev_km <- NULL
  final_km <- NULL

  cat("\n=== K-Means Clustering ===\n")
  for (k in 2:max_k) {
    set.seed(123)
    km <- kmeans(px_df, centers = k)
    centroids <- km$centers

    dists <- dist(centroids)
    cat(sprintf("\nk = %d:\n", k))
    print(dists)

    min_dist <- min(dists)

    if (min_dist < distance_thresh) {
      cat(sprintf("\nStopping at k = %d (min dist = %.3f < threshold = %.3f)\n",
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

  # Create color dataframe
  centroids <- final_km$centers
  cluster_ids <- final_km$cluster
  cluster_sizes <- table(cluster_ids)

  hex_codes <- apply(centroids, 1, function(rgb) {
    grDevices::rgb(rgb[1], rgb[2], rgb[3], maxColorValue = 1)
  })

  brightness_vals <- apply(centroids, 1, function(rgb) {
    0.2126 * rgb[1] + 0.7152 * rgb[2] + 0.0722 * rgb[3]
  })

  color_df <- data.frame(
    cluster_id = as.integer(names(cluster_sizes)),
    hex_code = hex_codes[as.integer(names(cluster_sizes))],
    size = as.integer(cluster_sizes),
    brightness = brightness_vals[as.integer(names(cluster_sizes))],
    stringsAsFactors = FALSE
  )

  # Calculate distances from image average
  color_df$rgb_distance <- apply(centroids[color_df$cluster_id, ], 1, function(rgb) {
    sqrt(sum((rgb - avg_rgb)^2))
  })
  color_df$brightness_distance <- abs(color_df$brightness - avg_brightness)

  color_df$ordered_size <- rank(-color_df$size, ties.method = "first")
  color_df$ordered_brightness <- rank(color_df$brightness, ties.method = "first")

  # Print results
  cat("\n=== Color Analysis ===\n")
  cat(sprintf("Image average RGB: (%.3f, %.3f, %.3f)\n",
              avg_rgb[1], avg_rgb[2], avg_rgb[3]))
  cat(sprintf("Image average brightness: %.3f\n\n", avg_brightness))
  print(color_df)

  cat("\n=== Colors by Size (largest → smallest) ===\n")
  colors_by_size <- color_df[order(color_df$ordered_size), ]
  for (i in 1:nrow(colors_by_size)) {
    cat(sprintf("%d. %s (size: %d pixels, %.1f%%)\n",
                i, colors_by_size$hex_code[i], colors_by_size$size[i],
                100 * colors_by_size$size[i] / sum(color_df$size)))
  }

  cat("\n=== Colors by Brightness (darkest → brightest) ===\n")
  colors_by_brightness <- color_df[order(color_df$ordered_brightness), ]
  for (i in 1:nrow(colors_by_brightness)) {
    cat(sprintf("%d. %s (brightness: %.3f, dist from avg: %.3f)\n",
                i, colors_by_brightness$hex_code[i],
                colors_by_brightness$brightness[i],
                colors_by_brightness$brightness_distance[i]))
  }

  # Reconstruct quantized image
  pixel_colors <- final_km$centers[final_km$cluster, ]
  quant_img <- array(NA, dim = c(h, w, 3))
  quant_img[, , 1] <- matrix(pixel_colors[,1], nrow = h, ncol = w)
  quant_img[, , 2] <- matrix(pixel_colors[,2], nrow = h, ncol = w)
  quant_img[, , 3] <- matrix(pixel_colors[,3], nrow = h, ncol = w)

  # Plotting
  if (plot_grid) {
    create_color_grid(color_df, grid_text)
  }

  if (plot_reconstruction) {
    plot(1:2, type = "n", xlab = "", ylab = "", axes = FALSE)
    rasterImage(quant_img, 1, 1, 2, 2, interpolate = FALSE)

    legend("topleft", legend = colors_by_brightness$hex_code,
           fill = colors_by_brightness$hex_code, border = "white",
           cex = 0.8, title = "By brightness", box.lwd = 0)

    legend("topright", legend = colors_by_size$hex_code,
           fill = colors_by_size$hex_code, border = "white",
           cex = 0.8, title = "By size", box.lwd = 0)
  }

  invisible(list(
    color_df = color_df,
    kmeans_result = final_km,
    quantized_image = quant_img,
    avg_rgb = avg_rgb,
    avg_brightness = avg_brightness
  ))
}

# Example usage:
# interpolate_hex("#E4E520", "#D6C51D", 0.3)

result <- analyze_album_colors(sprintf("%s.%s","Sabrina Carpenter - Short n' Sweet (Deluxe)", "jpg"), distance_thresh=0.16)
