import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { buildConfig, type CollectionConfig, type Access, type Where } from 'payload';
import { isContentDate, isStarRailSource, parseStarRailUpdate } from '../../packages/data/cms/starrail-updates';

const directory = path.dirname(fileURLToPath(import.meta.url));
const authenticated: Access = ({ req }) => Boolean(req.user);
const publishedStarRail: Where = { and: [{ gameId: { equals: 'starrail' } }, { _status: { equals: 'published' } }] };
const secret = process.env.PAYLOAD_SECRET;
if (!secret || secret.length < 32) throw new Error('Set PAYLOAD_SECRET (32+ characters); run npm run setup first.');

const Users: CollectionConfig = {
  slug: 'users', auth: true,
  admin: { useAsTitle: 'email' },
  access: { create: authenticated, read: authenticated, update: authenticated, delete: authenticated },
  fields: [],
};

const Updates: CollectionConfig = {
  slug: 'game-updates',
  labels: { singular: '游戏更新', plural: '游戏更新' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'gameId', 'locale', 'kind', '_status', 'checkedAt'] },
  versions: { drafts: true, maxPerDoc: 30 },
  access: {
    create: authenticated, update: authenticated, delete: authenticated,
    readVersions: authenticated,
    read: ({ req }) => req.user ? true : publishedStarRail,
  },
  hooks: {
    beforeValidate: [({ data, originalDoc, operation }) => {
      if (!data) return data;
      const merged = { ...originalDoc, ...data };
      if (operation === 'update' && originalDoc && (merged.gameId !== originalDoc.gameId || merged.locale !== originalDoc.locale || merged.slug !== originalDoc.slug)) {
        throw new Error('游戏、语言和标识创建后不可更改，请新建条目。');
      }
      data.contentKey = `${merged.gameId}:${merged.locale}:${merged.slug}`;
      return data;
    }],
    beforeChange: [({ data, originalDoc }) => {
      if ((data._status ?? originalDoc?._status) === 'published' && !parseStarRailUpdate({ ...originalDoc, ...data })) {
        throw new Error('发布前请补齐资料来源、核验日期、地区、事实和资料边界；版本条目还需版本号和发布日期。');
      }
      return data;
    }],
  },
  fields: [
    { name: 'contentKey', type: 'text', unique: true, index: true, admin: { hidden: true } },
    { name: 'gameId', label: '游戏', type: 'select', required: true, defaultValue: 'starrail', options: [{ label: '崩坏：星穹铁道', value: 'starrail' }] },
    { name: 'locale', label: '语言', type: 'select', required: true, defaultValue: 'zh', options: ['zh', 'en', 'ja'] },
    { name: 'slug', label: '标识（创建后固定）', type: 'text', required: true, maxLength: 100,
      validate: (v: unknown) => typeof v === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) || '使用小写英文、数字和连字符。' },
    { name: 'kind', label: '更新类型', type: 'select', required: true, options: [
      { label: '版本状态', value: 'version' }, { label: '跃迁', value: 'banner' }, { label: '活动', value: 'event' },
      { label: '角色资料', value: 'character' },
    ] },
    { name: 'title', label: '标题', type: 'text', required: true, maxLength: 200 },
    { name: 'summary', label: '摘要', type: 'textarea', required: true, maxLength: 2000 },
    { name: 'region', label: '适用区服', type: 'text', required: true, defaultValue: '国服；其他区服请独立核验', maxLength: 200 },
    { name: 'checkedAt', label: '来源核验日（YYYY-MM-DD）', type: 'text', required: true,
      validate: (v: unknown) => isContentDate(v) || '请输入有效的 YYYY-MM-DD 日期。' },
    { name: 'currentVersion', label: '版本号 / 名称', type: 'text', maxLength: 100, admin: { condition: d => d.kind === 'version' } },
    { name: 'releaseDate', label: '官方发布日期（YYYY-MM-DD）', type: 'text', admin: { condition: d => d.kind === 'version' } },
    { name: 'facts', label: '已核验事实', type: 'array', required: true, minRows: 1, maxRows: 20,
      fields: [{ name: 'text', label: '事实', type: 'textarea', required: true, maxLength: 4000 }] },
    { name: 'boundary', label: '未核验项 / 时间与地区边界', type: 'textarea', required: true, maxLength: 2000 },
    { name: 'sources', label: '资料来源', type: 'array', required: true, minRows: 1, maxRows: 10,
      fields: [{ name: 'url', label: 'HTTPS 链接', type: 'text', required: true,
        admin: { description: '官方文章须核对官方作者。已审核的社区详情页会在主站标为第三方资料；正文须写明版本、等级范围和冲突项。' },
        validate: (v: unknown) => isStarRailSource(v) || '请使用有效星铁官方链接或已审核允许的第三方详情页 HTTPS 链接。' }] },
  ],
};

export default buildConfig({
  secret,
  serverURL: process.env.CMS_SERVER_URL || 'http://127.0.0.1:4320',
  admin: { user: 'users', importMap: { baseDir: directory }, meta: { titleSuffix: '· Gachia 内容管理' } },
  collections: [Users, Updates],
  db: sqliteAdapter({ client: { url: process.env.DATABASE_URL || 'file:./.data/payload.db' }, push: process.env.NODE_ENV !== 'production' }),
  typescript: { outputFile: path.join(directory, 'payload-types.ts') },
});
