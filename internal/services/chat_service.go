package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"fitness-library/internal/models"
)

// ─── Pre-built Fitness Dictionary ─────────────────────────────────────────────

var fitnessDictionary = map[string]*models.TermExplanation{
	"vo2 max": {
		Term: "VO2 Max", IsKnown: true, IsOffline: true,
		Simple:       "Lượng oxy tối đa cơ thể có thể sử dụng khi tập luyện.",
		Detail:       "VO2 Max đo khả năng tim phổi vận chuyển và cơ bắp sử dụng oxy. Chỉ số càng cao, thể lực aerobic càng tốt. Người bình thường có VO2 Max 35-45, vận động viên đỉnh cao đạt 70-80.",
		Example:      "Khi chạy và cảm thấy không thở được nữa, bạn đang đạt giới hạn VO2 Max của mình.",
		RelatedTerms: []string{"Aerobic", "Cardio", "Thể lực"},
	},
	"hiit": {
		Term: "HIIT", IsKnown: true, IsOffline: true,
		Simple:       "Tập cường độ cao xen kẽ nghỉ ngắn — đốt mỡ cực hiệu quả.",
		Detail:       "HIIT (High Intensity Interval Training): tập cường độ cao 20-40 giây rồi nghỉ ngắn. Đốt mỡ hiệu quả hơn cardio thông thường, tốn ít thời gian hơn.",
		Example:      "Sprint 30 giây hết sức, nghỉ 15 giây, lặp lại 8-10 lần — đó là HIIT.",
		RelatedTerms: []string{"Cardio", "Tabata", "Circuit training"},
	},
	"progressive overload": {
		Term: "Progressive Overload", IsKnown: true, IsOffline: true,
		Simple:       "Tăng dần mức độ khó để cơ tiếp tục phát triển.",
		Detail:       "Cơ chỉ phát triển khi bị kích thích nhiều hơn trước. Tăng dần tạ, số set, số rep hoặc cường độ theo từng tuần.",
		Example:      "Tuần này squat 60kg, tuần sau tăng lên 62.5kg — đó là progressive overload.",
		RelatedTerms: []string{"1RM", "Volume", "Hypertrophy"},
	},
	"hypertrophy": {
		Term: "Hypertrophy", IsKnown: true, IsOffline: true,
		Simple:       "Cơ bắp phát triển to ra nhờ tập luyện.",
		Detail:       "Sợi cơ dày lên sau khi bị kích thích bởi tập tạ. Tập 8-12 reps với tải vừa phải tối ưu hypertrophy.",
		Example:      "Sau 3 tháng tập ngực đều đặn, vòng ngực tăng 3cm — kết quả của hypertrophy.",
		RelatedTerms: []string{"Progressive overload", "Protein", "Volume"},
	},
	"1rm": {
		Term: "1RM (One Rep Max)", IsKnown: true, IsOffline: true,
		Simple:       "Mức tạ nặng nhất bạn có thể nâng được đúng 1 lần.",
		Detail:       "Cơ sở để tính tải trọng tập. Thường tập 70-85% 1RM để tăng cơ, 85-95% để tăng sức mạnh.",
		Example:      "Bench press được 100kg đúng 1 lần thì 1RM = 100kg. Tập hypertrophy ở ~75kg.",
		RelatedTerms: []string{"Progressive overload", "RPE", "Strength training"},
	},
	"macros": {
		Term: "Macros (Macronutrients)", IsKnown: true, IsOffline: true,
		Simple:       "3 chất dinh dưỡng chính: protein, carb và chất béo.",
		Detail:       "Protein (4 cal/g), carbohydrate (4 cal/g), fat (9 cal/g). Kiểm soát macros giúp đạt mục tiêu tăng cơ hoặc giảm mỡ.",
		Example:      "150g cơm + 120g ức gà + 1 thìa dầu ô liu = bữa ăn kiểm soát macros cân bằng.",
		RelatedTerms: []string{"Protein", "TDEE", "Calorie deficit"},
	},
	"tdee": {
		Term: "TDEE (Total Daily Energy Expenditure)", IsKnown: true, IsOffline: true,
		Simple:       "Tổng lượng calo cơ thể đốt cháy mỗi ngày.",
		Detail:       "TDEE = BMR + calo tiêu hao khi vận động. Ăn dưới TDEE → giảm cân. Ăn trên TDEE → tăng cân.",
		Example:      "TDEE 2500 cal. Ăn 2000 cal/ngày → giảm ~0.5kg/tuần.",
		RelatedTerms: []string{"BMR", "Calorie deficit", "Macros"},
	},
	"bmr": {
		Term: "BMR (Basal Metabolic Rate)", IsKnown: true, IsOffline: true,
		Simple:       "Lượng calo cơ thể đốt khi nằm yên không làm gì.",
		Detail:       "Nhu cầu calo tối thiểu để duy trì sự sống (tim đập, thở, não hoạt động). Chiếm 60-70% tổng calo tiêu thụ mỗi ngày.",
		Example:      "Nam 70kg, 1m75, 25 tuổi có BMR khoảng 1750 cal — calo cần dù không làm gì.",
		RelatedTerms: []string{"TDEE", "Calorie", "Metabolism"},
	},
	"compound exercise": {
		Term: "Compound Exercise", IsKnown: true, IsOffline: true,
		Simple:       "Bài tập sử dụng nhiều nhóm cơ và nhiều khớp cùng lúc.",
		Detail:       "Ví dụ: squat, deadlift, bench press. Hiệu quả cao vì đốt calo nhiều hơn và kích thích hormone tăng trưởng tự nhiên.",
		Example:      "Squat dùng đùi trước, đùi sau, mông, lưng dưới và core cùng lúc.",
		RelatedTerms: []string{"Isolation exercise", "Compound lift", "Free weight"},
	},
	"isolation exercise": {
		Term: "Isolation Exercise", IsKnown: true, IsOffline: true,
		Simple:       "Bài tập tập trung vào một nhóm cơ duy nhất.",
		Detail:       "Chỉ di chuyển một khớp. Dùng để định hình cơ sau khi đã có nền tảng compound tốt.",
		Example:      "Bicep curl chỉ tập cơ tay trước (bicep) — đó là isolation exercise.",
		RelatedTerms: []string{"Compound exercise", "Muscle definition", "Bodybuilding"},
	},
	"superset": {
		Term: "Superset", IsKnown: true, IsOffline: true,
		Simple:       "Tập 2 bài liên tiếp không nghỉ ở giữa.",
		Detail:       "Tiết kiệm thời gian và tăng cường độ. Có thể cùng nhóm cơ hoặc nhóm cơ đối kháng.",
		Example:      "Bench press 10 reps → ngay lập tức barbell row 10 reps → nghỉ 90s → lặp lại.",
		RelatedTerms: []string{"Drop set", "Circuit training", "Volume"},
	},
	"drop set": {
		Term: "Drop Set", IsKnown: true, IsOffline: true,
		Simple:       "Giảm tạ ngay khi không thể làm thêm rep để tiếp tục set.",
		Detail:       "Tập đến thất bại ở tạ cao, giảm ngay 20-30% và tiếp tục. Tạo stress cơ cực đại.",
		Example:      "Curl 20kg đến failure → giảm 15kg tiếp → 10kg. Đó là drop set 3 lần.",
		RelatedTerms: []string{"Superset", "Training to failure", "Intensity"},
	},
	"periodization": {
		Term: "Periodization", IsKnown: true, IsOffline: true,
		Simple:       "Chia kế hoạch tập thành các giai đoạn với mục tiêu khác nhau.",
		Detail:       "Giai đoạn tăng cơ (volume cao, tạ vừa) → tăng sức mạnh (tạ nặng, volume thấp) → deload. Tránh plateau và tối ưu kết quả dài hạn.",
		Example:      "8 tuần hypertrophy (8-12 reps) → 4 tuần sức mạnh (3-5 reps) → 1 tuần deload.",
		RelatedTerms: []string{"Deload", "Progressive overload", "Training block"},
	},
	"deload": {
		Term: "Deload", IsKnown: true, IsOffline: true,
		Simple:       "Tuần tập nhẹ để cơ thể phục hồi sau thời gian tập nặng.",
		Detail:       "Giảm 40-60% khối lượng và cường độ sau mỗi 4-8 tuần tập nặng. Giúp hệ thần kinh và cơ bắp phục hồi hoàn toàn.",
		Example:      "Sau 6 tuần tập cường độ cao, tuần này chỉ tập 60% tạ bình thường với ít set hơn.",
		RelatedTerms: []string{"Periodization", "Overtraining", "Recovery"},
	},
	"rpe": {
		Term: "RPE (Rate of Perceived Exertion)", IsKnown: true, IsOffline: true,
		Simple:       "Thang điểm 1-10 đánh giá mức nặng cảm nhận khi tập.",
		Detail:       "RPE 10 = tạ tối đa. RPE 8 = còn 2 rep nữa mới thất bại. Giúp điều chỉnh tải theo cảm giác hôm đó.",
		Example:      "Squat 100kg cảm thấy RPE 7 (còn 3 rep) → nên tăng lên 105kg.",
		RelatedTerms: []string{"RIR", "1RM", "Training intensity"},
	},
	"rir": {
		Term: "RIR (Reps In Reserve)", IsKnown: true, IsOffline: true,
		Simple:       "Số rep còn lại có thể làm trước khi thất bại.",
		Detail:       "RIR 0 = thất bại hoàn toàn. RIR 2 = còn 2 rep. Tương đương RPE 8 = RIR 2. Kiểm soát cường độ chính xác hơn.",
		Example:      "Tập ở RIR 2 nghĩa là dừng khi còn 2 rep nữa mới không tập được.",
		RelatedTerms: []string{"RPE", "Training to failure", "Volume"},
	},
	"time under tension": {
		Term: "Time Under Tension (TUT)", IsKnown: true, IsOffline: true,
		Simple:       "Thời gian cơ phải gắng sức trong một set.",
		Detail:       "Tempo 3-1-2 (3s xuống, 1s giữ, 2s lên) tạo TUT cao hơn và kích thích hypertrophy tốt hơn.",
		Example:      "Squat xuống trong 3s thay vì 1s → TUT cao hơn gấp 3, cơ căng lâu hơn.",
		RelatedTerms: []string{"Hypertrophy", "Tempo training", "Volume"},
	},
	"mind-muscle connection": {
		Term: "Mind-Muscle Connection", IsKnown: true, IsOffline: true,
		Simple:       "Tập trung tinh thần vào cơ đang tập để co bóp hiệu quả hơn.",
		Detail:       "Nghiên cứu cho thấy tập trung vào cơ mục tiêu có thể tăng 20-30% kích hoạt cơ — đặc biệt quan trọng với isolation exercise.",
		Example:      "Khi tập bicep curl, tập trung cảm nhận cơ tay trước co lại thay vì nhìn điện thoại.",
		RelatedTerms: []string{"Muscle activation", "Isolation exercise", "Form"},
	},
	"plateau": {
		Term: "Plateau", IsKnown: true, IsOffline: true,
		Simple:       "Giai đoạn không còn tiến bộ dù tập đều đặn.",
		Detail:       "Cơ thể đã thích nghi với bài tập hiện tại. Cần thay đổi: tăng tải, đổi bài, điều chỉnh volume, hoặc deload rồi tăng lại.",
		Example:      "Bench press mắc kẹt ở 80kg suốt 2 tháng dù tập đều — đó là plateau.",
		RelatedTerms: []string{"Progressive overload", "Periodization", "Adaptation"},
	},
	"rest-pause": {
		Term: "Rest-Pause", IsKnown: true, IsOffline: true,
		Simple:       "Nghỉ ngắn 10-20 giây trong một set để tiếp tục thêm rep.",
		Detail:       "Tập đến thất bại, nghỉ 10-20s, tiếp tục 2-4 rep nữa. Tăng volume tổng mà không cần thêm set.",
		Example:      "Bicep curl 12 reps đến failure → nghỉ 15s → thêm 3 rep → nghỉ 15s → thêm 2 rep.",
		RelatedTerms: []string{"Drop set", "Superset", "Training to failure"},
	},
}

// LookupFitnessTerm checks the pre-built dictionary (case-insensitive).
// Returns nil if not found.
func LookupFitnessTerm(term string) *models.TermExplanation {
	key := strings.ToLower(strings.TrimSpace(term))
	if entry, ok := fitnessDictionary[key]; ok {
		cp := *entry
		if cp.RelatedTerms == nil {
			cp.RelatedTerms = []string{}
		}
		return &cp
	}
	return nil
}

// ─── ChatWithDocument ─────────────────────────────────────────────────────────

const chatSystemPrompt = `Bạn là trợ lý đọc sách chuyên về fitness và sức khoẻ.
Nhiệm vụ: trả lời câu hỏi của người dùng DỰA HOÀN TOÀN vào nội dung tài liệu được cung cấp bên dưới.

Quy tắc bắt buộc:
- Chỉ dùng thông tin có trong tài liệu, không bịa thêm.
- Nếu tài liệu không đề cập → nói rõ "Tài liệu này không đề cập đến vấn đề đó" và gợi ý user tìm tài liệu khác.
- Trả lời ngắn gọn: 3-5 câu, đủ ý, dễ hiểu.
- Trích dẫn đúng từ bài (copy nguyên văn, tối đa 2 đoạn, mỗi đoạn ≤ 80 ký tự).
- Dùng ngôn ngữ thân thiện, gần gũi — như người bạn tập gym.
- Chỉ trả về JSON thuần, không có markdown, không có giải thích ngoài JSON.

Nội dung tài liệu:
---
%s
---`

// ChatWithDocument answers a user question about a specific document.
func (s *AIService) ChatWithDocument(ctx context.Context, docContent, question string, history []models.ChatMessage) (*models.ChatResponse, error) {
	provider := s.provider()
	apiKey := s.apiKeyForProvider(provider)
	if apiKey == "" {
		return nil, fmt.Errorf("Cần cấu hình Claude API key trong Cài Đặt để dùng tính năng này.")
	}
	model := s.modelForProvider(provider)

	// Truncate content to 6000 runes
	runes := []rune(docContent)
	if len(runes) > 6000 {
		runes = runes[:6000]
	}
	content := string(runes)

	// Trim history to last 6 messages
	if len(history) > 6 {
		history = history[len(history)-6:]
	}

	historyJSON, _ := json.Marshal(history)

	sysPrompt := fmt.Sprintf(chatSystemPrompt, content)
	userPrompt := fmt.Sprintf(
		"Lịch sử hội thoại: %s\nCâu hỏi hiện tại: %s\n\nTrả về JSON:\n{\"answer\": \"câu trả lời\", \"citations\": [\"đoạn trích 1\"], \"isOnTopic\": true}",
		string(historyJSON), question,
	)
	fullPrompt := sysPrompt + "\n\n" + userPrompt

	raw, err := s.callProviderTokens(ctx, provider, apiKey, model, fullPrompt, 700)
	if err != nil {
		return nil, err
	}

	var resp models.ChatResponse
	cleaned := extractJSON(raw)
	if err := json.Unmarshal([]byte(cleaned), &resp); err != nil {
		// Fallback: return raw text as answer
		resp.Answer = strings.TrimSpace(raw)
		resp.IsOnTopic = true
	}
	if resp.Citations == nil {
		resp.Citations = []string{}
	}
	return &resp, nil
}

// ─── ExplainTerm ──────────────────────────────────────────────────────────────

const termSystemPrompt = `Bạn là chuyên gia giải thích thuật ngữ fitness và sức khoẻ cho người Việt Nam.
Giải thích đơn giản, không dùng từ kỹ thuật phức tạp hơn từ đang giải thích.
Luôn trả về JSON thuần, không markdown, không giải thích thêm.`

// ExplainTerm generates an explanation for a fitness term via AI.
func (s *AIService) ExplainTerm(ctx context.Context, term, context_, catID string) (*models.TermExplanation, error) {
	provider := s.provider()
	apiKey := s.apiKeyForProvider(provider)
	if apiKey == "" {
		return nil, fmt.Errorf("Cần cấu hình API key trong Cài Đặt để dùng tính năng này.")
	}
	model := s.modelForProvider(provider)

	userPrompt := fmt.Sprintf(
		`Thuật ngữ cần giải thích: "%s"
Ngữ cảnh xuất hiện: "%s"
Danh mục tài liệu: %s

Giải thích thuật ngữ này cho người mới tập gym hiểu được.
Nếu không biết → set isKnown: false, để trống các field khác.

Trả về JSON:
{"term": "%s", "simple": "1 câu ≤20 từ", "detail": "2-3 câu", "example": "ví dụ thực tế", "relatedTerms": ["term1", "term2"], "isKnown": true}`,
		term, context_, catID, term,
	)
	fullPrompt := termSystemPrompt + "\n\n" + userPrompt

	raw, err := s.callProviderTokens(ctx, provider, apiKey, model, fullPrompt, 500)
	if err != nil {
		return nil, err
	}

	var result models.TermExplanation
	cleaned := extractJSON(raw)
	if err := json.Unmarshal([]byte(cleaned), &result); err != nil {
		return nil, fmt.Errorf("không thể parse phản hồi AI: %w", err)
	}
	if result.RelatedTerms == nil {
		result.RelatedTerms = []string{}
	}
	return &result, nil
}

// ─── Shared helper ────────────────────────────────────────────────────────────

// callProviderTokens routes to the correct provider with a custom max_tokens.
func (s *AIService) callProviderTokens(ctx context.Context, provider, apiKey, model, prompt string, maxTokens int) (string, error) {
	switch provider {
	case "gemini":
		return s.callGemini(ctx, apiKey, model, prompt)
	case "openai":
		return s.callOpenAITokens(ctx, apiKey, model, prompt, maxTokens)
	default:
		return s.callClaudeTokens(ctx, apiKey, model, prompt, maxTokens)
	}
}
