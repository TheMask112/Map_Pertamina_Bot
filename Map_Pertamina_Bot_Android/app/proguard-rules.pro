-dontwarn java.awt.**
-dontwarn javax.xml.stream.**
-dontwarn net.sf.saxon.**
-dontwarn org.apache.batik.**
-dontwarn org.osgi.framework.**
-dontwarn org.apache.poi.**
-dontwarn aQute.bnd.**
-dontwarn org.apache.logging.**
-dontwarn org.apache.commons.**
-dontwarn org.apache.xmlbeans.**
-dontwarn org.openxmlformats.**
-dontwarn schemaorg_apache_xmlbeans.**
-dontwarn com.google.errorprone.annotations.**
-dontwarn com.google.crypto.tink.**

-keep class org.apache.poi.** { *; }
-keep interface org.apache.poi.** { *; }
-keep enum org.apache.poi.** { *; }

-keep class org.apache.xmlbeans.** { *; }
-keep interface org.apache.xmlbeans.** { *; }

-keep class org.openxmlformats.** { *; }
-keep interface org.openxmlformats.** { *; }

-keep class schemaorg_apache_xmlbeans.** { *; }
-keep interface schemaorg_apache_xmlbeans.** { *; }

-keep class org.apache.commons.** { *; }
-keep interface org.apache.commons.** { *; }

-keep class org.apache.logging.** { *; }
-keep interface org.apache.logging.** { *; }

-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable

-keepclassmembers class * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

-keepclassmembers class * {
    public <init>(...);
}
