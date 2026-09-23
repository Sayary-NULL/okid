from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework.validators import UniqueValidator

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ("id", "username", "password")

    def create(self, validated_data):
        if User.objects.exists():
            raise serializers.ValidationError(
                "Registration is only available on first launch."
            )
        user = User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
        )
        return user