import 'package:flutter/material.dart';

class LoadingOverlay extends StatelessWidget {
  final bool isLoading;
  final String? message;
  final Widget? child;
  
  const LoadingOverlay({
    Key? key,
    required this.isLoading,
    this.message,
    this.child,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    final children = <Widget>[];
    if (child != null) {
      children.add(child!);
    }
    if (isLoading) {
      children.add(
        Container(
          color: Colors.black.withOpacity(0.5),
          child: Center(
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircularProgressIndicator(),
                    if (message != null) ...[
                      const SizedBox(height: 16),
                      Text(message!),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }
    
    return Stack(
      children: children,
    );
  }
}
