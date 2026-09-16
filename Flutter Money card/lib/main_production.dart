import 'core/config/app_config.dart';
import 'main.dart' as entry;

Future<void> main() async {
  AppConfig.initialize(env: 'production');
  await entry.main();
}
