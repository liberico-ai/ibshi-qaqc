import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export class SystemInfoController {
  static async getInfo(req, res) {
    try {
      const pkgPath = path.resolve(process.cwd(), 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      
      // Ưu tiên đọc từ biến môi trường (truyền vào lúc build Docker)
      let gitHash = process.env.GIT_HASH || 'N/A';
      if (gitHash === 'N/A' || gitHash === 'unknown') {
        try {
          gitHash = execSync('git rev-parse --short HEAD', { stdio: 'pipe' }).toString().trim();
        } catch (e) {
          // No git or not a git repository
        }
      }
      
      // Nếu có biến môi trường dài (ví dụ: f3f42b89aa...), ta chỉ lấy 7 ký tự đầu
      if (gitHash && gitHash.length > 7 && gitHash !== 'unknown') {
        gitHash = gitHash.substring(0, 7);
      }

      // Ưu tiên lấy BUILD_TIME từ môi trường build
      let buildTime = process.env.BUILD_TIME;
      if (!buildTime || buildTime === 'unknown') {
        buildTime = new Date().toISOString();
        try {
          const stats = await fs.promises.stat(process.cwd());
          buildTime = stats.mtime.toISOString();
        } catch (e) {
          // ignore
        }
      }

      res.json({
        name: pkg.name,
        version: pkg.version,
        git_hash: gitHash,
        build_time: buildTime,
        dependencies: pkg.dependencies || {},
        dev_dependencies: pkg.devDependencies || {}
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch system info' });
    }
  }
}
