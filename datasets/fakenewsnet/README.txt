
FakeNewsNet Dataset Download Instructions:
==========================================

1. Visit: https://github.com/KaiDMML/FakeNewsNet
2. Follow the setup instructions in the repository
3. Use their download script to get the data
4. Place JSON files in datasets/fakenewsnet/:
   - politifact_fake/*.json
   - politifact_real/*.json
   - gossipcop_fake/*.json
   - gossipcop_real/*.json

Dataset Structure (JSON format):
- id: News ID
- title: Article title
- text: Article content
- url: Source URL
- tweet_ids: Related tweets
- publish_date: Publication date

Citation:
Shu, K., Mahudeswaran, D., Wang, S., Lee, D., & Liu, H. (2020). 
FakeNewsNet: A Data Repository with News Content, Social Context, 
and Spatiotemporal Information for Studying Fake News on Social Media.
Big Data, 8(3), 171-188.
