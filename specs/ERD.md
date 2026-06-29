```mermaid
erDiagram

        Role {
            USER USER
COLLABORATOR COLLABORATOR
ADMIN ADMIN
        }
    


        Grau {
            APRENDIZ APRENDIZ
ASSISTENTE ASSISTENTE
ALQUIMISTA ALQUIMISTA
PERITO PERITO
MESTRE_ALQUIMISTA MESTRE_ALQUIMISTA
        }
    
  "User" {
    String id "🗝️"
    String uid 
    String displayName 
    String email 
    String photoURL "❓"
    String whatsapp "❓"
    String state 
    String country 
    Role role 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Recipe" {
    String id "🗝️"
    String title 
    String description "❓"
    String image "❓"
    String momento 
    String tipo_prato 
    String base_alimento 
    String origem "❓"
    String time "❓"
    String prepTime "❓"
    String dietType "❓"
    String servings "❓"
    String difficulty "❓"
    String custo_estimado "❓"
    String instructions 
    Float rating 
    Int reviewsCount 
    Boolean isClassic 
    String slug "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "GlobalFoodItem" {
    String id "🗝️"
    String name 
    String category "❓"
    String source 
    String externalId "❓"
    Float calories 
    Float protein 
    Float carbohydrates 
    Float lipids 
    String baseUnit 
    Float baseQuantity 
    Json micronutrients "❓"
    }
  

  "RecipeIngredient" {
    String id "🗝️"
    Float quantity 
    String unit 
    String preparationMode "❓"
    Float preparationTime "❓"
    }
  

  "UserGamificationProfile" {
    String id "🗝️"
    Int nivel 
    Grau grau 
    Int xp_total 
    Int meta_nivel 
    }
  

  "UserInteraction" {
    String id "🗝️"
    String eventType 
    Int count 
    DateTime updatedAt 
    }
  

  "Badge" {
    String id "🗝️"
    String codigo_evento 
    String nome 
    String descricao "❓"
    String url_vercel_blob "❓"
    }
  

  "UserBadge" {
    String id "🗝️"
    DateTime timestamp 
    }
  

  "AvatarOption" {
    String id "🗝️"
    String codigoAvatar 
    String tierMinimo 
    String urlVercelBlob 
    DateTime criadoEm 
    }
  

  "SemanticDocument" {
    String id "🗝️"
    String title 
    String content 
    String url "❓"
    String type 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "LibraryItem" {
    String id "🗝️"
    String title 
    String description 
    String type 
    String category 
    String tags 
    String url 
    String thumbnail "❓"
    String author 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "UserSession" {
    String id "🗝️"
    DateTime startTime 
    DateTime lastPing 
    Int durationSeconds 
    }
  

  "PageAccess" {
    String id "🗝️"
    String path 
    DateTime timestamp 
    }
  

  "UnansweredQuery" {
    String id "🗝️"
    String queryText 
    String context "❓"
    String status 
    DateTime createdAt 
    DateTime updatedAt 
    }
  
    "User" |o--|| "Role" : "enum:role"
    "Recipe" }o--|| "User" : "owner"
    "RecipeIngredient" }o--|| "Recipe" : "recipe"
    "RecipeIngredient" }o--|| "GlobalFoodItem" : "foodItem"
    "UserGamificationProfile" |o--|| "Grau" : "enum:grau"
    "UserGamificationProfile" |o--|| "User" : "user"
    "UserInteraction" }o--|| "User" : "user"
    "UserBadge" }o--|| "User" : "user"
    "UserBadge" }o--|| "Badge" : "badge"
    "UserSession" }o--|| "User" : "user"
    "PageAccess" }o--|| "User" : "user"
    "UnansweredQuery" }o--|o "User" : "user"
```
