import { guides } from '../lib/data';
import GuideDetail, { generateMetadata } from '../app/[lang]/nte/guides/[slug]/page';
import { guideConsumerSecurityTests } from '../../web/test-support/guide-consumer';

guideConsumerSecurityTests('nte', guides, GuideDetail, generateMetadata);
