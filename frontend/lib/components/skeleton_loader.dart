import 'package:flutter/material.dart';

class SkeletonLoader extends StatelessWidget {
  final double height;
  final double width;
  final BorderRadius? borderRadius;
  final Color? color;

  const SkeletonLoader({
    Key? key,
    this.height = 20.0,
    this.width = double.infinity,
    this.borderRadius,
    this.color,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: width,
      decoration: BoxDecoration(
        color: color ?? Colors.grey[300],
        borderRadius: borderRadius ?? BorderRadius.circular(8),
      ),
      child: _buildShimmer(),
    );
  }

  Widget _buildShimmer() {
    return Stack(
      children: [
        // Base color
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
        // Shimmer effect
        Positioned.fill(
          child: _buildShimmerAnimation(),
        ),
      ],
    );
  }

  Widget _buildShimmerAnimation() {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 1500),
      curve: Curves.easeInOutSine,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment(-1.0, -0.5),
          end: Alignment(1.0, 0.5),
          colors: [
            Colors.white.withOpacity(0.0),
            Colors.white.withOpacity(0.3),
            Colors.white.withOpacity(0.0),
          ],
        ),
      ),
      child: Container(),
    );
  }
}

class TransactionCardSkeleton extends StatelessWidget {
  const TransactionCardSkeleton({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top row: icon + date
            Row(
              children: [
                Expanded(
                  child: SkeletonLoader(height: 40, width: 40),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: SkeletonLoader(height: 16),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Middle row: category + amount
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: SkeletonLoader(height: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: SkeletonLoader(height: 24, width: 80),
                ),
              ],
            ),
            const SizedBox(height: 8),
            // Bottom row: notes
            SkeletonLoader(height: 16),
          ],
        ),
      ),
    );
  }
}

class AccountCardSkeleton extends StatelessWidget {
  const AccountCardSkeleton({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            // Icon
            SkeletonLoader(height: 48, width: 48),
            const SizedBox(width: 16),
            // Info column
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonLoader(height: 24),
                  const SizedBox(height: 8),
                  SkeletonLoader(height: 20, width: 150),
                  const SizedBox(height: 8),
                  SkeletonLoader(height: 20, width: 100),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class CategoryChipSkeleton extends StatelessWidget {
  const CategoryChipSkeleton({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(20),
      ),
      child: const SizedBox(width: 80, height: 32),
    );
  }
}
