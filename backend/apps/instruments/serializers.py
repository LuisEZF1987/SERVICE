from rest_framework import serializers

from .models import InstrumentCalibration, MeasuringInstrument


class InstrumentCalibrationSerializer(serializers.ModelSerializer):
    result_display = serializers.CharField(source="get_result_display", read_only=True)

    class Meta:
        model = InstrumentCalibration
        fields = [
            "id", "instrument", "calibration_date", "due_date", "laboratory",
            "certificate_number", "certificate_file", "result", "result_display",
            "notes", "created_at",
        ]
        # instrument comes from the nested URL; due_date defaults to date + interval
        read_only_fields = ["id", "instrument", "created_at"]
        extra_kwargs = {"due_date": {"required": False}}

    def validate(self, attrs):
        due = attrs.get("due_date")
        if due and due <= attrs.get("calibration_date", due):
            raise serializers.ValidationError(
                {"due_date": "La próxima calibración debe ser posterior a la fecha de calibración."}
            )
        return attrs


class MeasuringInstrumentSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source="get_instrument_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    calibration_status = serializers.CharField(read_only=True)
    calibration_status_display = serializers.SerializerMethodField()
    days_to_due = serializers.IntegerField(read_only=True)
    latest_calibration = serializers.SerializerMethodField()

    class Meta:
        model = MeasuringInstrument
        fields = [
            "id", "name", "instrument_type", "type_display", "brand", "model_name",
            "serial_number", "status", "status_display", "assigned_to", "notes",
            "requires_calibration", "calibration_interval_months",
            "last_calibration_date", "calibration_due_date", "days_to_due",
            "calibration_status", "calibration_status_display", "latest_calibration",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "last_calibration_date", "calibration_due_date", "created_at", "updated_at"]

    def get_calibration_status_display(self, obj):
        return MeasuringInstrument.CalibrationStatus(obj.calibration_status).label

    def get_latest_calibration(self, obj):
        cal = next(
            (c for c in obj.calibrations.all() if c.result == InstrumentCalibration.Result.APPROVED),
            None,
        )
        return InstrumentCalibrationSerializer(cal, context=self.context).data if cal else None
