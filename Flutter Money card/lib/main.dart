import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/config/app_config.dart';
import 'core/storage/server_config_storage.dart';
import 'core/theme/app_theme.dart';
import 'routing/app_router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  AppConfig.initialize();
  await ServerConfigStorage().initialize();

  runApp(
    const ProviderScope(
      child: MoneyCardStaffApp(),
    ),
  );
}

class MoneyCardStaffApp extends ConsumerWidget {
  const MoneyCardStaffApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: !AppConfig.isProduction,
      theme: AppTheme.lightTheme,
      themeMode: ThemeMode.light,
      routerConfig: router,
    );
  }
}
