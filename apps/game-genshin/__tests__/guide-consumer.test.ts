import { genshinGuides } from '../lib/data';
import GuideDetail, { generateMetadata } from '../app/[lang]/genshin/guides/[slug]/page';
import { guideConsumerSecurityTests } from '../../web/test-support/guide-consumer';

guideConsumerSecurityTests('genshin', genshinGuides, GuideDetail, generateMetadata);
